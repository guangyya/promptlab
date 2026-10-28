import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const base = process.env.BASE_URL || 'http://127.0.0.1:4317';
const defaults = { theme: 'agnoster', accent: 'original', symbol: '❯', scenario: 'dirty', git: true, user: true, multiline: true, cols: 80 };
async function post(route, body, headers = {}) {
  const r = await fetch(base + route, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { status: r.status, ...await r.json() };
}
const catalog = await fetch(base + '/api/catalog').then(r => r.json());
assert.equal(catalog.themes.length, 9);
const temp = mkdtempSync(path.join(tmpdir(), 'promptlab-smoke-'));
try {
  for (const theme of catalog.themes) {
    const c = { ...defaults, theme: theme.id, accent: 'lavender' };
    const source = await post('/api/source', c);
    assert.equal(source.status, 200);
    const file = path.join(temp, `${theme.id}.zsh-theme`);
    writeFileSync(file, source.source);
    execFileSync('/bin/zsh', ['-fn', file]);
    const preview = await post('/api/render', c);
    assert.equal(preview.status, 200, `${theme.id}: ${preview.error}`);
    assert.match(preview.output, /src\/app\.ts/);
    assert.match(preview.output, /notes\.md/);
    assert.doesNotMatch(preview.output, /command not found|no such file or directory|parse error/i);
    console.log(`PASS ${theme.id}: valid export + real dirty Git preview`);
  }
  const checks = { clean: /Create a little space/, failed: /false/, long: /experimental/, venv: /\.venv/, ssh: /Connected over SSH/, conflict: /UU.*README\.md/ };
  const results = await Promise.all(Object.entries(checks).map(async ([scenario, pattern]) => {
    const result = await post('/api/render', { ...defaults, scenario });
    assert.equal(result.status, 200, `${scenario}: ${result.error}`);
    const plain = result.output.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
    assert.match(plain, pattern, scenario);
    return scenario;
  }));
  console.log(`PASS scenarios (including queued concurrency): ${results.join(', ')}`);
  assert.equal((await post('/api/source', { ...defaults, theme: '../../.zshrc' })).status, 400);
  assert.equal((await post('/api/source', { ...defaults, accent: 'constructor' })).status, 400);
  assert.equal((await post('/api/source', defaults, { origin: 'https://untrusted.example' })).status, 403);
  console.log('PASS invalid theme, invalid accent, and cross-origin rejection');
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(base.replace('http', 'ws') + '/api/terminal', { origin: base });
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('WebSocket timed out')); }, 15000);
    let ready = false, received = '';
    ws.on('open', () => ws.send(JSON.stringify({ type: 'start', config: defaults })));
    ws.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.type === 'data') received += Buffer.from(m.data, 'base64').toString('utf8');
      if (m.type === 'ready' && !ready) {
        ready = true;
        assert.match(received, /notes\.md/);
        ws.send(JSON.stringify({ type: 'command', command: 'echo hello; touch /tmp/not-allowed' }));
      }
      if (m.type === 'error' && ready) { assert.match(m.message, /POC/); clearTimeout(timer); ws.close(); resolve(); }
    });
    ws.on('error', reject);
  });
  console.log('PASS live PTY session, scenario initialization, and arbitrary-command rejection');
  console.log('All smoke checks passed.');
} finally { rmSync(temp, { recursive: true, force: true }); }
