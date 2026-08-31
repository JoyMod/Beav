#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(desktopRoot, '..');
const read = (target) => readFile(path.join(repositoryRoot, target), 'utf8');

const [mainSource, bridgeSource, aiSource, pluginManifest, pluginBackground, pluginDiagnostics, packageSource] = await Promise.all([
  read('desktop/electron/main.ts'),
  read('desktop/src/bridge/core.ts'),
  read('desktop/electron/core/aiSourceService.ts'),
  read('Plugin/src/manifest.json'),
  read('Plugin/src/background.js'),
  read('Plugin/src/background/diagnostics.js'),
  read('desktop/package.json'),
]);

const allowlist = mainSource.match(/const LOCAL_BROWSER_CHANNELS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
for (const forbidden of [':create', ':update', ':delete', ':save', ':switch', ':rename', ':import', ':bind', ':open']) {
  assert(!allowlist.includes(forbidden), `Local browser allowlist must stay read-only: ${forbidden}`);
}
for (const required of ['db:get-settings', 'spaces:list', 'media:list', 'subjects:list', 'subjects:categories:list']) {
  assert(allowlist.includes(required), `Local browser preview requires ${required}`);
}

assert(mainSource.includes("'http://localhost:5173'"));
assert(mainSource.includes("'http://127.0.0.1:5173'"));
assert(!mainSource.includes("res.setHeader('Access-Control-Allow-Origin', '*')"));
assert(mainSource.includes("settings.mcp_servers_json = '[]'"));
assert(mainSource.includes('redactLocalBrowserSecrets(getSettings() || {})'));
assert(bridgeSource.includes("['http://localhost:5173', 'http://127.0.0.1:5173']"));

assert(aiSource.includes("safeUrlJoin(baseURL, '/chat/completions')"));
assert(aiSource.includes("messages: [{ role: 'user', content: '请只回复 OK' }]"));
assert(aiSource.includes('接口返回成功，但没有收到模型回复'));

for (const source of [pluginManifest, pluginBackground, pluginDiagnostics, packageSource]) {
  assert(!source.includes('redbox.ziz.hk'));
  assert(!source.includes('api.ziz.hk'));
  assert(!source.includes('Jamailar/RedBox'));
}
assert(pluginBackground.includes('autoUpdateCheck: false'));
assert(pluginDiagnostics.includes("reason: 'local_only'"));
assert(packageSource.includes('https://github.com/JoyMod/Beav.git'));
assert(packageSource.includes('public/branding/logo.png'));

console.log(JSON.stringify({
  ok: true,
  localBrowserMode: 'read_only_redacted',
  modelCheck: 'real_chat_completion',
  pluginDiagnostics: 'local_only',
  updateSource: 'JoyMod/Beav',
}, null, 2));
