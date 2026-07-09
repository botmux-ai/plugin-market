import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginsDir = join(root, 'plugins');
const indexPath = join(root, 'index.json');
const mode = process.argv.includes('--write') ? 'write' : 'check';

const ID_RE = /^[a-z][a-z0-9._-]{0,63}$/;
const CATEGORY_RE = /^[a-z][a-z0-9-]{0,31}$/;

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function assertUrl(value, field, id) {
  if (value === undefined) return;
  if (typeof value !== 'string' || !value.trim()) fail(`${id}: ${field} must be a non-empty URL`);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') fail(`${id}: ${field} must use https`);
  } catch {
    fail(`${id}: ${field} must be a valid URL`);
  }
}

function validateEntry(entry, filename) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${filename}: entry must be an object`);
  const allowed = new Set(['id', 'package', 'displayName', 'description', 'repo', 'docs', 'categories', 'compatibility']);
  for (const key of Object.keys(entry)) {
    if (!allowed.has(key)) fail(`${filename}: unknown field ${key}`);
  }
  if (!ID_RE.test(entry.id ?? '')) fail(`${filename}: invalid id`);
  if (filename !== `${entry.id}.json`) fail(`${filename}: file name must be ${entry.id}.json`);
  if (typeof entry.package !== 'string' || !entry.package.trim()) fail(`${entry.id}: package is required`);
  if (entry.package === entry.id) fail(`${entry.id}: package must not be the short id`);
  if (entry.package.startsWith('@botmux-ai/') && entry.package !== `@botmux-ai/plugin-${entry.id}`) {
    fail(`${entry.id}: @botmux-ai package must be @botmux-ai/plugin-${entry.id}`);
  }
  if (typeof entry.displayName !== 'string' || !entry.displayName.trim()) fail(`${entry.id}: displayName is required`);
  if (typeof entry.description !== 'string' || !entry.description.trim()) fail(`${entry.id}: description is required`);
  assertUrl(entry.repo, 'repo', entry.id);
  assertUrl(entry.docs, 'docs', entry.id);
  if (!Array.isArray(entry.categories)) fail(`${entry.id}: categories must be an array`);
  const categories = new Set();
  for (const category of entry.categories) {
    if (typeof category !== 'string' || !CATEGORY_RE.test(category)) fail(`${entry.id}: invalid category ${category}`);
    if (categories.has(category)) fail(`${entry.id}: duplicate category ${category}`);
    categories.add(category);
  }
  if (!entry.compatibility || typeof entry.compatibility !== 'object' || Array.isArray(entry.compatibility)) {
    fail(`${entry.id}: compatibility is required`);
  }
  if (typeof entry.compatibility.botmux !== 'string' || !entry.compatibility.botmux.trim()) {
    fail(`${entry.id}: compatibility.botmux is required`);
  }
  return {
    id: entry.id,
    package: entry.package.trim(),
    displayName: entry.displayName.trim(),
    description: entry.description.trim(),
    repo: entry.repo.trim(),
    ...(entry.docs ? { docs: entry.docs.trim() } : {}),
    categories: [...categories].sort(),
    compatibility: { botmux: entry.compatibility.botmux.trim() },
  };
}

const entries = [];
const seen = new Set();
if (existsSync(pluginsDir)) {
  for (const filename of readdirSync(pluginsDir).sort()) {
    if (filename === '.gitkeep') continue;
    if (!filename.endsWith('.json')) fail(`plugins/${filename}: entries must be .json files`);
    const entry = validateEntry(readJson(join(pluginsDir, filename)), filename);
    if (seen.has(entry.id)) fail(`${entry.id}: duplicate id`);
    seen.add(entry.id);
    entries.push(entry);
  }
}

const index = {
  schemaVersion: 1,
  generatedAt: mode === 'write'
    ? new Date().toISOString()
    : (existsSync(indexPath) ? readJson(indexPath).generatedAt : '1970-01-01T00:00:00.000Z'),
  plugins: entries,
};

if (mode === 'write') {
  mkdirSync(dirname(indexPath), { recursive: true });
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
} else {
  const current = existsSync(indexPath) ? readJson(indexPath) : undefined;
  const normalizedCurrent = current ? { ...current, generatedAt: index.generatedAt } : undefined;
  if (JSON.stringify(normalizedCurrent, null, 2) !== JSON.stringify(index, null, 2)) {
    fail('index.json is stale; run npm run build');
  }
}

console.log(`validated ${entries.length} plugin entr${entries.length === 1 ? 'y' : 'ies'}`);

