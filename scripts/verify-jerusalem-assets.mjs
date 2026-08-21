import { JERUSALEM_ASSETS, verifyCanonicalAssets } from './jerusalem-assets.mjs';

const results = verifyCanonicalAssets();
const failures = results.filter((item) => item.status !== 'ok');

if (failures.length) {
  console.error('Jerusalem artwork preflight failed. Canonical source assets must be committed byte-for-byte in src/assets/jerusalem/.');
  for (const item of failures) {
    if (item.status === 'missing') console.error(`- MISSING ${item.name} expected=${item.sha256}`);
    else console.error(`- HASH ${item.name} expected=${item.sha256} actual=${item.actual}`);
  }
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: 'pass', assets: JERUSALEM_ASSETS.length, files: results.map(({ name, sha256 }) => ({ name, sha256 })) }, null, 2));
}
