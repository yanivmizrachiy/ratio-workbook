import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const CANONICAL_ASSET_DIR = path.join(ROOT, 'src', 'assets', 'jerusalem');

export const JERUSALEM_ASSETS = Object.freeze([
  ['cover_bg.jpg', '704cf13e05a6cacf5c2b793c6e47d097962450f34663ae7b1d8ae3fc0eea55d8'],
  ['ratio-jerusalem-v2-1-kotel.jpg', 'ce03a0f594346eeaae9c5ad91c764b9cf2341ce50911fe2436bc979e4bf7a5d1'],
  ['ratio-jerusalem-v2-2-tower-of-david.jpg', 'ce39d3ceddc3acde2a3cb321070d55df1bf48128fb154139623f8c42185be40f'],
  ['ratio-jerusalem-v2-3-mahane-yehuda.jpg', '73bbea70c539139985b10204deb12518d34a9cbbe3e706fbc571bd2dadf73615'],
  ['ratio-jerusalem-v2-5-old-city-alley.jpg', '527acc4209cd7c2b84cf985036eff28e1fd3682616cfbeafd3c329d35349fd3c'],
  ['ratio-jerusalem-v2-6-knesset.jpg', '3985c4170afa48ccb8fc3a3345f0a70fc6daef1ee1a1c8a7a49e44ce5935d4ea'],
  ['ratio-jerusalem-v2-7-windmill.jpg', '0ab7c296bbbecc2f7ea4726897344c6aff23a0bc6ddc8e6b87b58f12503d8363'],
].map(([name, sha256]) => Object.freeze({ name, sha256 })));

export function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function canonicalAssetPath(name) {
  return path.join(CANONICAL_ASSET_DIR, name);
}

export function verifyCanonicalAssets() {
  return JERUSALEM_ASSETS.map((asset) => {
    const file = canonicalAssetPath(asset.name);
    if (!fs.existsSync(file)) return { ...asset, file, status: 'missing' };
    const actual = sha256File(file);
    return { ...asset, file, actual, status: actual === asset.sha256 ? 'ok' : 'hash-mismatch' };
  });
}
