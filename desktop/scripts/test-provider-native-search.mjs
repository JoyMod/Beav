#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const esbuildPath = createRequire(require.resolve('vite')).resolve('esbuild');
const { build } = await import(pathToFileURL(esbuildPath).href);
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zhuye-provider-search-'));
const bundledModule = path.join(tempRoot, 'provider-search.mjs');
const requests = [];

const server = createServer((request, response) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    const payload = JSON.parse(body || '{}');
    requests.push({ url: request.url, body: payload });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      output: [{
        type: 'message',
        content: [{
          type: 'output_text',
          text: payload.model.includes('grok')
            ? 'Grok 搜索完成。[[1]](https://x.com/test/status/1)'
            : '方舟搜索完成。',
          annotations: payload.model.includes('grok') ? [] : [{ url: 'https://example.com/ark' }],
        }],
      }],
    }));
  });
});

try {
  await build({
    entryPoints: [path.join(desktopRoot, 'electron/core/providerNativeSearchService.ts')],
    outfile: bundledModule,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert(address && typeof address === 'object');
  const service = await import(`${pathToFileURL(bundledModule).href}?t=${Date.now()}`);
  const baseURL = `http://127.0.0.1:${address.port}/v1`;

  assert.equal(service.requiresProviderNativeSearch('在？'), false);
  assert.equal(service.requiresProviderNativeSearch('帮我查一下今天推特上的消息'), true);

  const grok = await service.searchWithProviderNativeTools(
    { apiKey: 'grok-key', baseURL, model: 'grok-4.6' },
    { query: '查询 X', source: 'auto' },
  );
  assert.equal(grok.provider, 'xai');
  assert.deepEqual(grok.citations, ['https://x.com/test/status/1']);
  assert.deepEqual(requests[0].body.tools.map((tool) => tool.type), ['web_search', 'x_search']);

  const ark = await service.searchWithProviderNativeTools(
    { apiKey: 'ark-key', baseURL: baseURL.replace('127.0.0.1', 'ark.cn-beijing.volces.com'), model: 'deepseek-v4-flash' },
    { query: '查询新闻' },
    undefined,
    (url, init) => fetch(url.replace('ark.cn-beijing.volces.com', '127.0.0.1'), init),
  );
  assert.equal(ark.provider, 'ark');
  assert.deepEqual(ark.citations, ['https://example.com/ark']);
  assert.deepEqual(requests[1].body.tools, [{ type: 'web_search' }]);

  console.log(JSON.stringify({ ok: true, grok: ['web_search', 'x_search'], ark: ['web_search'], citations: true }, null, 2));
} finally {
  await new Promise((resolve) => server.close(() => resolve()));
  await rm(tempRoot, { recursive: true, force: true });
}

