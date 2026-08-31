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
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zhuye-ai-source-'));
const bundledModule = path.join(tempRoot, 'ai-source-service.mjs');
const requests = [];

const server = createServer((request, response) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: JSON.parse(body || '{}'),
    });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(request.url?.endsWith('/embeddings')
      ? { data: [{ embedding: [0.1, 0.2, 0.3] }] }
      : { choices: [{ message: { content: 'OK' } }] }));
  });
});

try {
  await build({
    entryPoints: [path.join(desktopRoot, 'electron/core/aiSourceService.ts')],
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
  const { testAiSourceConnection } = await import(`${pathToFileURL(bundledModule).href}?t=${Date.now()}`);
  const result = await testAiSourceConnection({
    apiKey: 'test-key',
    baseURL: `http://127.0.0.1:${address.port}/v1`,
    model: 'ep-test-model',
    presetId: 'ark',
    protocol: 'openai',
  });

  assert.equal(result.success, true);
  assert.equal(result.verifiedModel, 'ep-test-model');
  assert.match(result.message, /真实对话验证通过/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, '/v1/chat/completions');
  assert.equal(requests[0].authorization, 'Bearer test-key');
  assert.equal(requests[0].body.model, 'ep-test-model');
  assert.deepEqual(requests[0].body.messages, [{ role: 'user', content: '请只回复 OK' }]);

  const embeddingResult = await testAiSourceConnection({
    apiKey: '',
    baseURL: `http://127.0.0.1:${address.port}/v1`,
    model: 'local-embedding-model',
    presetId: 'ollama-local',
    protocol: 'openai',
    purpose: 'embedding',
  });
  assert.equal(embeddingResult.success, true);
  assert.equal(embeddingResult.verifiedModel, 'local-embedding-model');
  assert.match(embeddingResult.message, /真实向量验证通过.*3 维/);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].method, 'POST');
  assert.equal(requests[1].url, '/v1/embeddings');
  assert.equal(requests[1].authorization, undefined);
  assert.deepEqual(requests[1].body, {
    model: 'local-embedding-model',
    input: ['竹叶向量连接测试'],
  });

  console.log(JSON.stringify({ ok: true, protocol: 'openai-compatible', requests: ['chat/completions', 'embeddings'] }, null, 2));
} finally {
  await new Promise((resolve) => server.close(() => resolve()));
  await rm(tempRoot, { recursive: true, force: true });
}
