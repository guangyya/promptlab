import { themes, config, themeSource, upstream, allowedCommands, getTheme, fileStem } from './theme-source.mjs';

import { inspectSource, renderImported } from './import-preview.mjs';
import { checkSource } from './source-check.mjs';
import { hasPromptOptions, contextText } from './prompt-options.mjs';

export const DEFAULT = { theme: 'agnoster', accent: 'original', symbol: 'auto', scenario: 'dirty', git: true, user: true, multiline: true, cols: 80, fontSize: 13, palette: 'neutral', font: 'nerd' };
const names = { mint: 'green', cyan: 'cyan', lavender: 'magenta', amber: 'yellow', blue: 'blue' };
const numbers = { black: 30, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, white: 37, grey: 90 };
const RESET = '\x1b[0m';
const fg = (color, text, bold = false) => `\x1b[${bold ? '1;' : ''}${typeof color === 'number' ? `38;5;${color}` : numbers[color] || 39}m${text}${RESET}`;
const segment = (background, foreground, text) => `\x1b[48;5;${background};38;5;${foreground}m ${text} ${RESET}\x1b[38;5;${background}m${RESET}`;

export function normalizeDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid draft');
  const c = config({ ...DEFAULT, ...value });
  return { ...c, cols: Math.round(c.cols), palette: ['neutral','light','dracula','nord','solarized-dark','solarized-light','carbon','midnight','paper'].includes(value.palette) ? value.palette : DEFAULT.palette,
    font: value.font === 'system' ? 'system' : 'nerd', fontSize: Math.max(11, Math.min(17, Number(value.fontSize) || DEFAULT.fontSize)) };
}
export function encodeDraft(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeDraft(value)));
  let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  return btoa(binary);
}
export function decodeDraft(value) {
  if (value.length > 200000) throw new Error('This draft link is too large. Import a draft file instead.');
  return normalizeDraft(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)))));
}
export async function localRequest(url, body) {
  if (url === '/api/catalog') return { themes, sha: upstream.sha, engine: 'Browser simulation', commands: allowedCommands };
  if (url === '/api/source') { const c = normalizeDraft(body); return { source: themeSource(c), filename: `${fileStem(c)}.zsh-theme`, config: c }; }
  if (url === '/api/render') return { output: renderSnapshot(body) };
  throw new Error('Unknown local operation');
}
export function exportTheme(value) {
  const c = normalizeDraft(value);
  return { source: `${themeSource(c)}\n# Source license\n${(getTheme(c).licenseText || 'License not supplied. See the source repository.').split('\n').map(line => '# ' + line).join('\n')}\n`, filename: `${fileStem(c)}.zsh-theme` };
}
const plain = text => text.replace(/\x1b\[[0-9;]*m/g, '');
function width(text) {
  return Array.from(plain(text)).reduce((n, ch) => n + (/\p{Mark}/u.test(ch) ? 0 : /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\uff01-\uff60]/u.test(ch) ? 2 : 1), 0);
}
function stateFor(c) { return { cwd: '/home/alex/code/promptlab' + (c.scenario === 'long' ? '/packages/design-system/components/navigation/experimental' : ''), exit: 0, scenario: c.scenario }; }
const homePath = cwd => cwd === '/home/alex' ? '~' : cwd.replace(/^\/home\/alex\//, '~/');
function pathPart(cwd, count = 0) { const p = homePath(cwd); return count && p.split('/').length > count ? p.split('/').slice(-count).join('/') : p; }

export function prompt(c, state, command='') {
  const color = original => c.accent === 'original' ? original : names[c.accent];
  const repo = state.cwd === '/home/alex/code/promptlab' || state.cwd.startsWith('/home/alex/code/promptlab/');
  const git = (c.sourceOverride!==undefined||c.git) && repo;
  const dirty = ['dirty', 'failed', 'venv', 'conflict'].includes(state.scenario);
  const branch = 'feat/new-prompt';
  const cwd = homePath(state.cwd), basename = state.cwd.split('/').pop() || '/';
  const path = original => hasPromptOptions(c.theme)&&c.directory&&c.directory!=='theme'?(c.directory==='full'?cwd:basename):original;
  const identity = 'alex@workstation';
  const symbol = fallback => c.symbol === 'auto' ? fallback : c.symbol;
  const endSymbol = () => c.symbol === 'auto' ? '' : fg(color('green'), symbol('❯')) + ' ';
  let left = '', right = '';
  if(c.sourceOverride!==undefined) {
    const parsed=checkSource(c.sourceOverride).preview;
    if(!parsed.supported)return fg('grey','Preview unavailable for edited source. Open Source for details.')+'\r\n';
    ({left,right}=renderImported(parsed,{cwd,git,branch,dirty,exit:state.exit,fg}));
  } else if (c.theme === 'agnoster') {
    let previous;
    const block = (bg, text) => { const n = numbers[bg] - 30; const transition = previous !== undefined ? `\x1b[${numbers[previous]};${40 + n}m\ue0b0` : `\x1b[${40 + n}m`; previous = bg; return transition + `\x1b[${bg === 'black' ? 37 : 30}m ${text} `; };
    left = block('black', `${state.exit ? fg('red', '✘ ') + '\x1b[37;40m' : ''}${identity}`) + block(color('blue'), cwd);
    if (git) left += block(dirty ? 'yellow' : 'green', `\ue0a0 ${branch}${dirty ? ' ±' : ''}`);
    if (state.scenario === 'venv') left += block(color('blue'), '.venv');
    left += `\x1b[49;${numbers[previous]}m\ue0b0${RESET} ` + endSymbol();
  } else if (c.theme === 'robbyrussell') {
    left = fg(state.exit ? 'red' : color('green'), symbol('➜'), true) + '  ' + fg(color('cyan'), path(basename));
    if (git) left += ' ' + fg(color('blue'), 'git:(', true) + fg('red', branch) + fg(color('blue'), ')') + (dirty ? fg('yellow', ' ✗') : '');
    left += ' ';
  } else if (c.theme === 'bira') {
    left = '╭─' + fg(color('green'), identity, true) + ' ' + fg(color('blue'), cwd, true) + ' ';
    if (git) left += fg('yellow', '‹' + branch) + (dirty ? fg('red', '●') : '') + fg('yellow', '› ');
    if (state.scenario === 'venv') left += fg(color('green'), '‹.venv› ');
    left += '\r\n╰─\x1b[1m' + symbol('$') + RESET + ' ';
    if (state.exit) right = fg('red', '1 ↵', true);
  } else if (c.theme === 'af-magic') {
    const idx = { mint: 78, cyan: 81, lavender: 141, amber: 214, blue: 75 };
    left = fg(237, '-'.repeat(c.cols)) + '\r\n' + fg(c.accent === 'original' ? 32 : idx[c.accent], cwd);
    if (git) left += ' ' + fg(75, '(') + fg(78, branch) + (dirty ? fg(214, '*') : '') + fg(75, ')');
    left += ' ' + fg(105, symbol('»')) + ' ';
    right = (state.exit ? fg('red', '1 ↵') : '') + (state.scenario === 'venv' ? fg(75, ' [.venv]') : '') + fg(237, ' ' + identity);
  } else if (c.theme === 'ys') {
    left = '\r\n' + fg(color('blue'), '#', true) + ' ' + fg(color('cyan'), 'alex') + ' @ ' + fg(color('green'), 'workstation') + ' in ' + fg('yellow', cwd, true);
    if (git) left += ' on ' + fg(color('blue'), 'git') + fg(color('cyan'), ':' + branch) + fg(dirty ? 'red' : color('green'), dirty ? ' x' : ' o');
    if (state.scenario === 'venv') left += fg(color('green'), ' .venv %');
    left += ' [12:34:56]' + (state.exit ? ' C:' + fg('red', '1') : '') + '\r\n' + fg('red', symbol('$')+' ', true);
  } else if (c.theme === 'avit') {
    left = '\r\n' + (state.scenario === 'ssh' ? fg(color('cyan'), identity) + ':' : '') + fg(color('blue'), pathPart(state.cwd, 3), true) + '  ';
    if (git) left += fg(color('green'), branch) + fg(dirty ? 'red' : color('green'), dirty ? ' ✗' : ' ✔');
    left += '\r\n' + fg('white', symbol('▶')+' ');
    right = (git ? fg('white', '0m ') + (dirty ? fg('yellow', '⚑ ') + fg('white', '◒ ') : '') : '') + (state.exit ? fg('red', '⍉') : '');
  } else if (c.theme === 'clean') {
    left = fg('white', 'alex', true) + ':' + fg(color('blue'), basename + '/', true) + ' ';
    if (git) left += fg(color('blue'), '(') + fg('yellow', branch, true) + (dirty ? fg('red', '✗', true) : '') + fg(color('blue'), ')') + ' ';
    left += symbol('$')+' ';
    right = '[12:34:56]';
  } else if (c.theme === 'candy') {
    left = fg(color('green'), identity, true) + ' ' + fg(color('blue'), '[12:34:56]') + ' ' + fg('white', '[' + cwd + ']') + ' ';
    if (git) left += fg(color('green'), '[' + branch) + (dirty ? fg('red', ' *') : '') + fg(color('green'), ']');
    left += '\r\n' + fg(color('blue'), '->') + fg(color('blue'), ' '+symbol('$')+' ', true);
  } else if (c.theme === 'pure') {
    left = fg(color('blue'),cwd)+(git?' '+fg('grey',branch)+(dirty?fg('grey','*'):''):'')+'\r\n'+fg(state.exit?'red':'magenta',symbol('❯'))+' ';
  } else if (c.theme === 'spaceship') {
    left = fg(color('cyan'),cwd,true)+(git?' on '+fg('magenta',' '+branch)+(dirty?fg('red',' [!]'):''):'')+(state.scenario==='venv'?' via '+fg('yellow','🐍 .venv'):'')+'\r\n'+fg(state.exit?'red':'green',symbol('➜'))+' ';
  } else if (c.theme === 'powerlevel10k') {
    left = fg(color('blue'),'╭─ '+cwd)+(git?' '+fg(dirty?'yellow':'green',' '+branch+(dirty?' !1 ?1':'')):'')+'\r\n'+fg(color('blue'),'╰─ ')+fg(state.exit?'red':'green',symbol('❯'))+' ';
    if(state.exit)right=fg('red','1 ✘');
  } else if (c.theme === 'dracula') {
    left = fg(color('magenta'),state.scenario==='ssh'?identity:'alex',true)+' '+fg(color('blue'),cwd,true)+' '+(git?fg(color('cyan'),'('+branch+')')+' '+fg(dirty?'yellow':'green',dirty?'✗':'✓'):'')+'\r\n'+fg(state.exit?'red':color('green'),symbol('➜'),true)+' ';
  } else if (c.theme === 'bullet-train' || c.theme === 'powerlevel9k') {
    const backgrounds={mint:2,cyan:6,lavender:5,amber:3,blue:4};
    left=(c.theme==='bullet-train'?segment(7,0,'12:34:56'):'')+segment(0,7,identity)+segment(backgrounds[c.accent]??4,7,cwd);
    if(state.scenario==='venv'&&c.theme==='bullet-train')left+=segment(3,7,'.venv');
    if(git)left+=segment(dirty?3:2,0,' '+branch+(dirty?' ±':''));
    left+='\r\n'+fg(state.exit?'red':color('green'),symbol(c.theme==='bullet-train'?'$':'❯'))+' ';
    if(state.exit&&c.theme==='powerlevel9k')right=fg('red','1 ✘');
  } else if (c.theme === 'typewritten') {
    left=fg(color('magenta'),cwd)+(git?' → '+fg(color('magenta'),branch)+(dirty?fg('yellow',' !')+fg('blue',' ?'):''):'')+'\r\n'+(state.scenario==='venv'?'.venv ':'')+fg(state.exit?'red':'blue',symbol('❯'))+' ';
  } else if (c.theme === 'geometry') {
    left=' '+fg(state.exit?'red':'default',symbol(state.exit?'△':'▲'))+' '+fg(color('blue'),cwd)+' ';
    if(git)right=fg('magenta',' '+branch)+(dirty?' :: '+fg('red',state.scenario==='conflict'?'×':'●'):'');
  } else if (c.theme === 'alien') {
    const backgrounds={mint:2,cyan:6,lavender:5,amber:3,blue:4};
    left=(state.exit?segment(196,19,'1'):'')+segment(17,254,'12:34')+segment(26,254,'alex')+segment(backgrounds[c.accent]??45,19,cwd);
    if(git)left+=segment(238,51,' '+branch)+(dirty?segment(253,16,state.scenario==='conflict'?'!':'⭑ ?'):'');
    left+='\r\n'+(state.scenario==='ssh'?fg(245,'ssh '):'')+(state.scenario==='venv'?fg(245,'.venv '):'')+fg(228,symbol('❱'),true)+' ';
  } else if (c.theme === 'agkozak') {
    left=(state.exit?fg('red','(1) ',true):'')+fg('green',state.scenario==='ssh'?identity:'alex',true)+' '+fg(color('blue'),pathPart(state.cwd,2),true)+(state.scenario==='venv'?fg('green',' [.venv]'):'')+'\r\n'+symbol('$')+' ';
    if(git)right=fg('yellow','('+branch+(dirty?' !?':'')+')');
  } else if (c.theme === 'git-prompt') {
    left=fg('white',cwd,true)+' '+(git?'['+fg('magenta',branch)+'|'+(dirty?fg('red',state.scenario==='conflict'?'✖1':'✚1')+'…1':fg('green','✔'))+'] ':'')+fg(state.exit?'red':color('green'),symbol('❯❯❯'))+' ';
  } else if (c.theme === 'lambda-mod') {
    left='\r\n'+fg(state.exit?'red':color('green'),symbol('λ'),true)+' '+fg('yellow','alex',true)+' '+fg(color('magenta'),'['+pathPart(state.cwd,3)+']')+(git?' at '+fg(color('blue'),' '+branch)+(dirty?' '+fg('blue','!')+fg('cyan','?'):fg('green',' ✔')):'')+'\r\n'+fg(color('cyan'),symbol('→'),true)+' ';
    if(git)right=fg('blue','[a1b2c3d]');
  } else if(c.imported) {
    const parsed=inspectSource(c.imported.source);
    if(!parsed.supported)return fg('grey','Preview unavailable. Open Source to inspect this theme.')+'\r\n';
    ({left,right}=renderImported(parsed,{cwd,git,branch,dirty,exit:state.exit,fg}));
    left+=endSymbol();
  } else if(['simple','arrow','fishy','cloud','lambda','minimal','awesomepanda','tonotdo','dst','terminalparty'].includes(c.theme)) {
    const branchText=git?fg(color('green'),branch)+(dirty?fg('red',' *'):''):'';
    if(c.theme==='simple')left=fg(color('green'),path(cwd))+(git?' '+fg('blue','(')+branchText+fg('blue',')'):'')+' '+endSymbol();
    if(c.theme==='arrow'){left=fg('yellow',basename+' '+symbol('➤'))+' ';right=git?'git:'+branch+(dirty?'*':''):'';}
    if(c.theme==='fishy'){left=fg(color('green'),'alex')+'@workstation '+fg(color('green'),cwd.replace(/\/([^/])[^/]+(?=\/)/g,'/$1'))+symbol('>')+' ';right=(state.exit?fg('red','1 '):'')+branchText;}
    if(c.theme==='cloud')left=fg(color('cyan'),'☁ ')+fg(color('green'),path(basename))+' '+(git?'['+branchText+'] ':'')+fg('blue',symbol('%')+' ');
    if(c.theme==='lambda')left=symbol('λ')+' '+cwd+'/ '+branchText+' ';
    if(c.theme==='minimal')left=pathPart(state.cwd,2)+' '+(git?'['+branch+(dirty?'●':'')+'] ':'')+symbol('»')+' ';
    if(c.theme==='awesomepanda')left=fg(state.exit?'red':color('green'),symbol('➜'))+' '+fg(color('cyan'),path(basename))+' '+(git?'git:('+branchText+') ':'');
    if(c.theme==='tonotdo'){left=fg(color('cyan'),'alex')+fg('magenta','➜')+fg(color('green'),pathPart(state.cwd,3))+(git?'('+branchText+')':'')+symbol('»')+' ';right='[12:34:56]';}
    if(c.theme==='dst'){left=(state.exit?fg('red','FAIL')+'\r\n':'')+fg('magenta','alex')+'@'+fg('yellow','workstation')+': '+fg(color('blue'),cwd)+branchText+'\r\n'+symbol('$')+' ';right=fg('green','[12:34:56]');}
    if(c.theme==='terminalparty'){left=fg(state.exit?'red':'green',symbol('%'))+' ';right=pathPart(state.cwd,2)+(git?' ('+branch+(dirty?' ⚡':'')+')':'')+' workstation';}
  } else {
    left = (c.user ? fg(242, identity) + ' ' : '') + fg(color('green'), cwd);
    if (git) left += ' ' + fg(242, 'on ') + fg('magenta', branch) + (dirty ? fg('yellow', ' *') : '');
    left += (c.multiline ? '\r\n' : ' ') + fg(state.exit ? 'red' : color('green'), symbol('❯')) + ' ';
    if (state.exit) right = fg('red', 'exit 1');
  }
  if(c.sourceOverride===undefined&&hasPromptOptions(c.theme)) {
    if(c.context&&c.context!=='theme')left=fg(242,contextText(c.context))+' '+left;
    if(c.commandLine==='newline')left+='\r\n'+fg(state.exit?'red':color('green'),symbol(c.theme==='cloud'?'%':c.theme==='simple'?'❯':'➜'))+' ';
    if(c.clock)right+=(right?' ':'')+fg(242,'12:34:56');
  }
  // Right prompt placement is an approximation; the browser does not execute ZLE.
  const lastLine = left.split('\r\n').at(-1);
  if (right && width(lastLine) + width(command) + width(right) + 2 < c.cols) left += `\x1b[${c.cols - width(right)}G${right}\x1b[${width(lastLine) + 1}G`;
  return left;
}

function commandResult(command, state) {
  if (!command.trim()) return '';
  if (!allowedCommands.includes(command)) throw new Error('Command not available. Type help to see the commands you can try.');
  const dirty = ['dirty', 'failed', 'venv', 'conflict'].includes(state.scenario);
  const repo = state.cwd === '/home/alex/code/promptlab' || state.cwd.startsWith('/home/alex/code/promptlab/');
  state.exit = command === 'false' ? 1 : 0;
  if (command === 'false' || command === 'true' || command === 'clear') return '';
  if (command === 'pwd') return state.cwd + '\r\n';
  if (command === 'whoami') return 'alex\r\n';
  if (command === 'hostname') return 'workstation\r\n';
  if (command === 'python --version') return 'Python 3.12.7\r\n';
  if (command === 'which python') return (state.scenario==='venv'?'/home/alex/code/promptlab/.venv/bin/python':'/usr/bin/python')+'\r\n';
  if (command === 'cat missing.txt') { state.exit=1; return fg('red','cat: missing.txt: No such file or directory')+'\r\n'; }
  if (command === 'echo hello') return 'hello\r\n';
  if (command === 'help') return 'Commands you can try:\r\n' + allowedCommands.join(', ') + '\r\n';
  if (command.startsWith('cd ')) {
    if (command === 'cd ..') state.cwd = state.cwd.substring(0, state.cwd.lastIndexOf('/')) || '/';
    if (command === 'cd ~') state.cwd = '/home/alex';
    if (command === 'cd ~/code/promptlab') state.cwd = '/home/alex/code/promptlab';
    return '';
  }
  if (command === 'ls' || command === 'ls -la') return command === 'ls' ? 'README.md  ' + fg('blue', 'src') + (dirty ? '  notes.md' : '') + '\r\n' : 'total 16\r\ndrwxr-xr-x  alex  staff  128 Oct 28 12:34 .\r\n-rw-r--r--  alex  staff   42 Oct 28 12:34 README.md\r\ndrwxr-xr-x  alex  staff   96 Oct 28 12:34 src\r\n';
  if (command.startsWith('git ') && !repo) { state.exit = 128; return 'fatal: not a git repository (or any of the parent directories): .git\r\n'; }
  if (command === 'git status --short') return state.scenario === 'conflict' ? fg('red', 'UU README.md') + '\r\n' : dirty ? ' ' + fg('red', 'M') + ' src/app.ts\r\n' + fg('red', '??') + ' notes.md\r\n' : '';
  if (command === 'git diff --stat') return dirty?' README.md  | 4 ++--\r\n src/app.ts | 8 ++++++--\r\n 2 files changed, 8 insertions(+), 4 deletions(-)\r\n':'';
  if (command === 'git merge --continue') { if(state.scenario!=='conflict'){state.exit=128;return 'fatal: There is no merge in progress\r\n';}state.exit=1;return fg('red','error: Committing is not possible because you have unmerged files.')+'\r\n'; }
  if (command === 'git status') return 'On branch feat/new-prompt\r\n' + (state.scenario === 'conflict' ? 'You have unmerged paths.\r\n  both modified: README.md\r\n' : dirty ? 'Changes not staged for commit:\r\n  ' + fg('red', 'modified: src/app.ts') + '\r\nUntracked files:\r\n  ' + fg('red', 'notes.md') + '\r\n' : 'nothing to commit, working tree clean\r\n');
  if (command === 'git branch') return '* ' + fg('green', 'feat/new-prompt') + '\r\n  main\r\n';
  if (command === 'git log --oneline -3') return fg('yellow', 'a1b2c3d') + ' (HEAD -> feat/new-prompt) Add theme presets\r\n'+fg('yellow','e4f5a6b')+' Improve prompt spacing\r\n'+fg('yellow','c7d8e9f')+' Create the playground\r\n';
  return '';
}
export function previewInfo(c) {
 if(c.sourceOverride!==undefined)return checkSource(c.sourceOverride).preview;
 return c.imported?inspectSource(c.imported.source):{supported:true};
}
function initial(c, state, compact=false) {
  const info=previewInfo(c);
  if(!info.supported)return '\x1b[2J\x1b[H'+fg('white',c.name||getTheme(c).name)+'\r\n\r\n'+fg('grey','Preview unavailable for this source.')+'\r\n'+fg('grey','Open Source to inspect and download it.')+'\r\n';
  const commands = {
   clean:['pwd','ls','git log --oneline -3','git status --short'],
   dirty:['pwd','ls','cat missing.txt','git status --short'],
   failed:['pwd','ls','cat missing.txt'],
   long:['pwd','ls','git status --short'],
   venv:['pwd','which python','python --version','git status --short'],
   ssh:['whoami','hostname','pwd','ls'],
   conflict:['pwd','git status --short','git diff --stat','git merge --continue'],
  };
  return '\x1b[2J\x1b[H'+(compact?commands[c.scenario].slice(-2):commands[c.scenario]).map(command=>prompt(c,state,command)+command+'\r\n'+commandResult(command,state)).join('')+prompt(c,state);
}
export function renderSnapshot(value) { const c = normalizeDraft(value); return initial(c, stateFor(c),value.compact===true); }
export function createBrowserSession(value, callbacks) {
  const c = normalizeDraft(value), state = stateFor(c);
  let closed = false;
  const session = {
    readyState: 1,
    send(raw) {
      if (closed) return;
      try {
        const message = JSON.parse(raw);
        if (message.type !== 'command') return;
        const result = commandResult(message.command, state);
        callbacks.onData((message.command === 'clear' ? '\x1b[2J\x1b[H' : message.command + '\r\n' + result) + prompt(c, state), callbacks.onReady);
      } catch (e) { state.exit=127; callbacks.onData(JSON.parse(raw).command + '\r\n' + fg('red', e.message) + '\r\n' + prompt(c,state), callbacks.onReady); callbacks.onError?.(e.message); }
    },
    close() { closed = true; session.readyState = 3; },
  };
  queueMicrotask(() => { if (!closed) callbacks.onData(initial(c, state), () => { if (!closed) callbacks.onReady?.(); }); });
  return session;
}
