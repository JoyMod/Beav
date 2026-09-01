const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const desktopDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopDir, '..');
const sourceDir = path.join(repoRoot, 'Plugin');
const extensionDir = path.join(sourceDir, 'dist', 'extension');
const runtimeRoot = path.join(desktopDir, '.plugin-runtime');
const targetDir = path.join(runtimeRoot, 'browser-extension');

function copyDirectory(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

if (!fs.existsSync(sourceDir)) {
  console.warn(`[prepare-plugin-runtime] Plugin source not found, skip: ${sourceDir}`);
  process.exit(0);
}

for (const script of ['sync-manifest-version.mjs', 'build.mjs']) {
  const result = spawnSync(process.execPath, [path.join(sourceDir, 'scripts', script)], {
    cwd: sourceDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`[prepare-plugin-runtime] Plugin build failed: ${script}`);
    process.exit(result.status || 1);
  }
}

if (!fs.existsSync(path.join(extensionDir, 'manifest.json'))) {
  console.error(`[prepare-plugin-runtime] Built extension manifest not found: ${extensionDir}`);
  process.exit(1);
}

copyDirectory(extensionDir, targetDir);
console.log(`[prepare-plugin-runtime] synced browser extension -> ${targetDir}`);
