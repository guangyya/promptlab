"""A loopback POC worker: curated themes and allowlisted commands only, not a public sandbox."""
import base64
import errno
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import shutil
import signal
import struct
import subprocess
import sys
import termios
import time

job = json.loads(Path(sys.argv[1]).read_text())
job_dir = Path(job['dir'])
home = job_dir / 'home'
project = home / 'code' / 'promptlab'
project.mkdir(parents=True)
(home / '.cache').mkdir()

def git(*args, cwd=project, check=True):
    return subprocess.run(['git', *args], cwd=cwd, check=check, stdout=subprocess.DEVNULL,
                          stderr=subprocess.DEVNULL, env={**os.environ, 'HOME': str(home), 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null'})

git('init', '-b', 'main')
git('config', 'user.email', 'demo@promptlab.local')
git('config', 'user.name', 'Promptlab')
(project / 'README.md').write_text('# A little space for your next idea.\n')
(project / 'src').mkdir()
(project / 'src' / 'app.ts').write_text('export const greeting = "hello, world";\n')
git('add', '.')
git('commit', '-qm', 'Create a little space for ideas')
git('checkout', '-qb', 'feat/new-prompt')
scenario = job['scenario']
cwd = project
if scenario in ('dirty', 'failed', 'venv'):
    (project / 'src' / 'app.ts').write_text('export const greeting = "make it yours";\n')
    (project / 'notes.md').write_text('Try a new prompt.\n')
if scenario == 'long':
    cwd = project / 'packages' / 'design-system' / 'components' / 'navigation' / 'experimental'
    cwd.mkdir(parents=True)
if scenario == 'conflict':
    git('checkout', '-qb', 'other')
    (project / 'README.md').write_text('other branch\n')
    git('commit', '-qam', 'An alternative idea')
    git('checkout', 'feat/new-prompt')
    (project / 'README.md').write_text('our branch\n')
    git('commit', '-qam', 'Our idea')
    git('merge', 'other', check=False)

def quote(value):
    return "'" + str(value).replace("'", "'\\''") + "'"

rc = f"""
export ZSH={quote(job['vendor'])}
export ZSH_CUSTOM={quote(home / '.custom')}
export ZSH_CACHE_DIR={quote(home / '.cache')}
export ZSH_COMPDUMP={quote(home / '.zcompdump')}
export DISABLE_AUTO_TITLE=true
export DISABLE_AUTO_UPDATE=true
export ZSH_DISABLE_COMPFIX=true
export VIRTUAL_ENV_DISABLE_PROMPT=1
zstyle ':omz:update' mode disabled
zstyle ':omz:alpha:lib:git' async-prompt no
plugins=()
ZSH_THEME=''
source "$ZSH/oh-my-zsh.sh"
unset HISTFILE
unsetopt share_history inc_append_history
bindkey -e
source {quote(job_dir / 'theme.zsh-theme')}
cd {quote(cwd)}
printf '\\033[2J\\033[H'
{'false' if scenario == 'failed' else 'true'}
"""
(home / '.zshrc').write_text(rc)
env = {**os.environ, 'HOME': str(home), 'ZDOTDIR': str(home), 'TERM': 'xterm-256color',
       'COLORTERM': 'truecolor', 'LANG': 'en_US.UTF-8', 'LC_ALL': 'en_US.UTF-8',
       'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null', 'SHELL': '/bin/zsh'}
# Do not inherit runtime/module/plugin environment from the user's terminal.
for key in ['ZSH', 'ZSH_CUSTOM', 'VIRTUAL_ENV', 'CONDA_DEFAULT_ENV', 'SSH_CONNECTION', 'SSH_CLIENT', 'SSH_TTY', 'ZSH_TMUX_AUTOSTART', 'ZSH_EXECUTION_STRING']:
    env.pop(key, None)
if scenario == 'ssh':
    env['SSH_CONNECTION'] = '192.0.2.10 50123 192.0.2.20 22'
    env['SSH_CLIENT'] = '192.0.2.10 50123 22'
    env['SSH_TTY'] = '/dev/pts/0'
if scenario == 'venv':
    env['VIRTUAL_ENV'] = str(project / '.venv')
    (project / '.venv').mkdir()

pid, master = pty.fork()
if pid == 0:
    os.chdir(cwd)
    os.execve('/bin/zsh', ['zsh', '-d', '-i'], env)

def resize(cols, rows):
    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', int(rows), int(cols), 0, 0))

resize(job['cols'], job['rows'])
stopped = False
def stop(*_):
    global stopped
    stopped = True
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)

def emit(data):
    if job['mode'] == 'snapshot':
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()
    else:
        print(json.dumps({'type': 'data', 'data': base64.b64encode(data).decode()}), flush=True)

started = time.monotonic()
last_output = started
ran_command = False
command_at = None
live_ready = False
stdin_buffer = b''
demo_commands = {'clean': 'git log --oneline -1', 'dirty': 'git status --short', 'failed': 'false', 'long': 'pwd', 'venv': 'echo $VIRTUAL_ENV', 'ssh': 'echo "Connected over SSH (simulated)"', 'conflict': 'git status --short'}
try:
    while not stopped and time.monotonic() - started < 178:
        readers = [master] + ([sys.stdin.fileno()] if job['mode'] == 'live' else [])
        ready, _, _ = select.select(readers, [], [], 0.08)
        if master in ready:
            try:
                data = os.read(master, 65536)
            except OSError as e:
                if e.errno == errno.EIO:
                    break
                raise
            if not data:
                break
            emit(data)
            last_output = time.monotonic()
        if job['mode'] == 'live' and sys.stdin.fileno() in ready:
            data = os.read(sys.stdin.fileno(), 4096)
            if not data:
                break
            stdin_buffer += data
            while b'\n' in stdin_buffer:
                line, stdin_buffer = stdin_buffer.split(b'\n', 1)
                message = json.loads(line)
                if 'command' in message:
                    command = message['command']
                    if command == 'help':
                        command = "printf 'Demo commands: pwd, ls, git status, git branch, git log --oneline -3, whoami, true, false, echo hello, clear, cd .., cd ~, cd ~/code/promptlab\\n'"
                    os.write(master, command.encode() + b'\r')
                elif 'cols' in message:
                    resize(message['cols'], message['rows'])
        now = time.monotonic()
        if not ran_command and now - started > 0.7 and now - last_output > 0.18:
            os.write(master, demo_commands[scenario].encode() + b'\r')
            ran_command, command_at = True, now
        if job['mode'] == 'live' and ran_command and not live_ready and now - last_output > 0.2 and now - command_at > 0.3:
            print(json.dumps({'type': 'ready'}), flush=True)
            live_ready = True
        if job['mode'] == 'snapshot':
            if ran_command and now - last_output > 0.3 and now - command_at > 0.45:
                break
            if now - started > 8:
                raise RuntimeError('Shell startup timed out')
finally:
    try:
        os.killpg(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    for _ in range(20):
        child, _ = os.waitpid(pid, os.WNOHANG)
        if child:
            break
        time.sleep(0.025)
    else:
        try:
            os.killpg(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        os.waitpid(pid, 0)
    os.close(master)
