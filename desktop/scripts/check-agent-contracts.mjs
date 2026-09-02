import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoots = [
  path.join(desktopRoot, 'builtin-skills'),
  path.join(desktopRoot, 'electron', 'builtin-skills'),
  path.join(desktopRoot, 'electron', 'system-skills'),
];
const actualTools = new Set(['app_cli', 'skill', 'provider_search']);
const forbiddenProtocols = [
  ['Operate(', 'legacy Operate tool'],
  ['taskBrief.update', 'nonexistent taskBrief tool'],
  ['manuscripts.writeCurrent', 'nonexistent manuscript action'],
  ['profiles://', 'nonexistent profile URI'],
  ['skills.invoke', 'nonexistent skill invocation protocol'],
];

function collectSkillFiles(root, files = []) {
  if (!existsSync(root)) return files;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) collectSkillFiles(entryPath, files);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(entryPath);
  }
  return files;
}

const failures = [];
const files = skillRoots.flatMap((root) => collectSkillFiles(root));
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const relative = path.relative(desktopRoot, file);
  const allowedTools = content.match(/^allowedTools:\s*\[([^\]]*)\]/m)?.[1]
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean) || [];
  for (const tool of allowedTools) {
    if (!actualTools.has(tool)) failures.push(`${relative}: unknown allowedTools entry "${tool}"`);
  }
  for (const [token, label] of forbiddenProtocols) {
    if (content.includes(token)) failures.push(`${relative}: ${label} (${token})`);
  }
}

if (failures.length > 0) {
  console.error('Agent contract check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Agent contract check passed: ${files.length} skill documents use executable tool protocols.`);
