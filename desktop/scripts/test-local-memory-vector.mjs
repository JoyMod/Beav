#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const esbuildPath = createRequire(require.resolve('vite')).resolve('esbuild');
const { build } = await import(pathToFileURL(esbuildPath).href);
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zhuye-local-memory-vector-'));

const bundleWithMocks = async (entryPoint, outfile, mocks) => {
  await build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    plugins: [{
      name: 'isolated-test-mocks',
      setup(buildApi) {
        for (const [specifier, contents] of Object.entries(mocks)) {
          buildApi.onResolve({ filter: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, () => ({
            path: specifier,
            namespace: 'isolated-test',
          }));
          buildApi.onLoad({ filter: /.*/, namespace: 'isolated-test' }, (args) => ({
            contents: mocks[args.path],
            loader: 'js',
          }));
        }
      },
    }],
  });
};

try {
  globalThis.__zhuyeIndexTest = {
    hash: 'old-hash',
    embedMode: 'valid',
    embedCalls: 0,
    deleteCalls: 0,
    deleteReturn: 0,
    clearCalls: 0,
    clearReturn: 0,
    replacements: [],
    versions: 0,
    invalidations: 0,
    beforeEmbedResolve: null,
  };

  const indexBundle = path.join(tempRoot, 'index-manager.mjs');
  await bundleWithMocks(
    path.join(desktopRoot, 'electron/core/IndexManager.ts'),
    indexBundle,
    {
      '../db': `
        const state = globalThis.__zhuyeIndexTest;
        export const getVectorStats = () => ({ totalVectors: 0, totalDocuments: 0 });
        export const getVectorHash = () => state.hash;
        export const getActiveSpaceId = () => 'space-test';
        export const replaceVectorsForSource = (sourceId, vectors) => state.replacements.push({ sourceId, vectors });
        export const deleteVectors = () => { state.deleteCalls += 1; return state.deleteReturn; };
        export const clearVectorsForActiveSpace = () => { state.clearCalls += 1; return state.clearReturn; };
        export const incrementKnowledgeVersion = () => { state.versions += 1; };
      `,
      './vector/EmbeddingService': `
        const state = globalThis.__zhuyeIndexTest;
        export const embeddingService = {
          createChunks: async () => ['chunk'],
          embedDocuments: async () => {
            state.embedCalls += 1;
            if (state.embedMode === 'fail') throw new Error('isolated embedding failure');
            if (state.beforeEmbedResolve) state.beforeEmbedResolve();
            if (state.embedMode === 'mismatch') return [];
            return [[0.1, 0.2, 0.3]];
          },
        };
      `,
      './vector/VectorStore': `
        const state = globalThis.__zhuyeIndexTest;
        export const vectorStore = { invalidateCache: () => { state.invalidations += 1; } };
      `,
    },
  );

  const { IndexManager } = await import(`${pathToFileURL(indexBundle).href}?t=${Date.now()}`);
  const manager = new IndexManager();
  const item = {
    id: 'note-1',
    sourceId: 'note-1',
    sourceType: 'note',
    title: '标题',
    content: '正文',
    displayData: { platform: 'redbook' },
    scope: 'user',
  };
  const expectedHash = createHash('md5').update('标题\n\n正文').digest('hex');

  globalThis.__zhuyeIndexTest.hash = expectedHash;
  assert.equal(await manager.reindexItem(item), true);
  assert.equal(globalThis.__zhuyeIndexTest.embedCalls, 0, 'unchanged content must skip embedding');

  globalThis.__zhuyeIndexTest.hash = 'old-hash';
  globalThis.__zhuyeIndexTest.embedMode = 'fail';
  assert.equal(await manager.reindexItem(item), false);
  assert.equal(globalThis.__zhuyeIndexTest.replacements.length, 0, 'failed embedding must preserve old vectors');

  globalThis.__zhuyeIndexTest.embedMode = 'mismatch';
  assert.equal(await manager.reindexItem(item), false);
  assert.equal(globalThis.__zhuyeIndexTest.replacements.length, 0, 'invalid response must not replace vectors');

  globalThis.__zhuyeIndexTest.embedMode = 'valid';
  assert.equal(await manager.reindexItem(item), true);
  assert.equal(globalThis.__zhuyeIndexTest.replacements.length, 1);
  assert.equal(globalThis.__zhuyeIndexTest.versions, 1);
  assert.equal(globalThis.__zhuyeIndexTest.invalidations, 1);

  globalThis.__zhuyeIndexTest.deleteReturn = 1;
  manager.removeItem('note-1');
  assert.equal(globalThis.__zhuyeIndexTest.deleteCalls, 1);
  assert.equal(globalThis.__zhuyeIndexTest.versions, 2);
  assert.equal(globalThis.__zhuyeIndexTest.invalidations, 2);

  const raceItem = { ...item, id: 'note-race', sourceId: 'note-race' };
  globalThis.__zhuyeIndexTest.deleteReturn = 0;
  globalThis.__zhuyeIndexTest.beforeEmbedResolve = () => manager.removeItem('note-race');
  assert.equal(await manager.reindexItem(raceItem), false);
  assert.equal(globalThis.__zhuyeIndexTest.replacements.length, 1, 'removed item must not be written after in-flight embedding');
  globalThis.__zhuyeIndexTest.beforeEmbedResolve = null;

  globalThis.__zhuyeIndexTest.clearReturn = 2;
  await manager.clearAndRebuild();
  assert.equal(globalThis.__zhuyeIndexTest.clearCalls, 1);
  assert.equal(globalThis.__zhuyeIndexTest.versions, 3);
  assert.equal(globalThis.__zhuyeIndexTest.invalidations, 3);

  globalThis.__zhuyeMemoryTestRoot = path.join(tempRoot, 'memory-workspace');
  const memoryBundle = path.join(tempRoot, 'file-memory-store.mjs');
  await bundleWithMocks(
    path.join(desktopRoot, 'electron/core/fileMemoryStore.ts'),
    memoryBundle,
    {
      '../db': `
        export const getWorkspacePaths = () => ({ base: globalThis.__zhuyeMemoryTestRoot });
        export const getUserMemories = () => [];
      `,
    },
  );
  const memory = await import(`${pathToFileURL(memoryBundle).href}?t=${Date.now()}`);
  const first = await memory.addUserMemoryToFile('写作语气：简洁', 'preference', ['写作']);
  const duplicate = await memory.addUserMemoryToFile('写作语气：简洁', 'preference', ['表达']);
  assert.equal(duplicate.id, first.id);
  assert.deepEqual(new Set(duplicate.tags), new Set(['写作', '表达']));

  const latest = await memory.addUserMemoryToFile('写作语气：直接', 'preference', ['风格']);
  assert.equal(latest.id, first.id);
  assert.equal(latest.revision, 2);
  assert.equal((await memory.listUserMemoriesFromFile()).length, 1);
  assert.equal((await memory.listArchivedMemoriesFromFile()).length, 1);

  const search = await memory.searchUserMemoriesInFile('写作语气');
  assert.equal(search[0]?.content, '写作语气：直接');
  assert.match(await memory.getLongTermMemoryPrompt(10), /写作语气：直接/);
  await assert.rejects(
    () => memory.addUserMemoryToFile('api_key=abcdefghijklmnop', 'fact'),
    /拒绝写入长期记忆/,
  );

  const memoryDir = path.join(globalThis.__zhuyeMemoryTestRoot, 'memory');
  await Promise.all([
    access(path.join(memoryDir, 'user-memories.json')),
    access(path.join(memoryDir, 'MEMORY.md')),
    access(path.join(memoryDir, 'MEMORY_ARCHIVE.md')),
  ]);

  console.log(JSON.stringify({
    ok: true,
    vectorIndex: 'atomic_replace_delete_sync_cache_invalidation',
    memory: 'isolated_file_store_dedupe_archive_secret_guard',
    userDataTouched: false,
  }, null, 2));
} finally {
  delete globalThis.__zhuyeIndexTest;
  delete globalThis.__zhuyeMemoryTestRoot;
  await rm(tempRoot, { recursive: true, force: true });
}
