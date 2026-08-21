import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_ASSET_DIR, JERUSALEM_ASSETS, sha256File, verifyCanonicalAssets } from './jerusalem-assets.mjs';

const sourceDir = path.resolve(process.argv[2] || process.env.RATIO_JERUSALEM_ASSET_DIR || '');
if (!sourceDir || !fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  throw new Error('Usage: node scripts/import-jerusalem-assets.mjs <directory-containing-original-jpegs>');
}

function walk(dir, depth = 3, out = []) {
  if (depth < 0) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, depth - 1, out);
    else if (/\.jpe?g$/i.test(entry.name)) out.push(full);
  }
  return out;
}

const candidates = walk(sourceDir);
const byHash = new Map();
for (const file of candidates) {
  try { byHash.set(sha256File(file), file); } catch { /* unreadable candidate */ }
}

fs.mkdirSync(CANONICAL_ASSET_DIR, { recursive: true });
const imported = [];
for (const asset of JERUSALEM_ASSETS) {
  const source = byHash.get(asset.sha256);
  if (!source) throw new Error(`Exact original not found for ${asset.name} (${asset.sha256})`);
  const target = path.join(CANONICAL_ASSET_DIR, asset.name);
  fs.copyFileSync(source, target);
  if (sha256File(target) !== asset.sha256) throw new Error(`Post-copy SHA mismatch for ${asset.name}`);
  imported.push({ name: asset.name, source, target, sha256: asset.sha256 });
}

const final = verifyCanonicalAssets();
if (final.some((item) => item.status !== 'ok')) throw new Error('Canonical asset verification failed after import.');
console.log(JSON.stringify({ status: 'imported', assets: imported.length, imported }, null, 2));
