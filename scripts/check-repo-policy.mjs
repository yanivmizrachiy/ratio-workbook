import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
const required = ['verify-preview.yml', 'release-production.yml'];

if (!fs.existsSync(workflowsDir)) throw new Error('Missing .github/workflows');
const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name)).sort();
for (const name of required) {
  if (!workflowFiles.includes(name)) throw new Error(`Missing canonical workflow: ${name}`);
}

const texts = new Map(workflowFiles.map((name) => [name, fs.readFileSync(path.join(workflowsDir, name), 'utf8')]));

for (const [name, text] of texts) {
  if (/\bschedule\s*:/m.test(text)) throw new Error(`Scheduled workflow is forbidden: ${name}`);
  if (/\bworkflow_run\s*:/m.test(text)) throw new Error(`workflow_run publisher chain is forbidden: ${name}`);
  if (/\bissues\s*:/m.test(text) || /\bissue_comment\s*:/m.test(text)) {
    throw new Error(`Issue/comment-triggered automation is forbidden in canonical workbook CI: ${name}`);
  }
  const writesContents = /permissions:[\s\S]*?\bcontents\s*:\s*write\b/m.test(text);
  if (writesContents && name !== 'release-production.yml') {
    throw new Error(`Only release-production.yml may have contents: write: ${name}`);
  }
  if (/git\s+push[^\n]*(?:HEAD:main|origin\s+main)/i.test(text) && name !== 'release-production.yml') {
    throw new Error(`Direct push to main outside the manual release workflow: ${name}`);
  }
}

const verify = texts.get('verify-preview.yml');
for (const token of ['contents: read', 'npm run verify', 'persist-credentials: false']) {
  if (!verify.includes(token)) throw new Error(`verify-preview.yml missing safety token: ${token}`);
}
if (/\bcontents\s*:\s*write\b/.test(verify)) throw new Error('Verification workflow must be read-only.');

const release = texts.get('release-production.yml');
for (const token of [
  'workflow_dispatch:',
  "inputs.confirmation == 'PUBLISH'",
  "github.ref == 'refs/heads/main'",
  'npm run verify',
  'Prevent stale-main release',
  'git push origin HEAD:main',
]) {
  if (!release.includes(token)) throw new Error(`release-production.yml missing release guard: ${token}`);
}
for (const forbidden of ['schedule:', 'workflow_run:', 'issues:', 'issue_comment:']) {
  if (release.includes(forbidden)) throw new Error(`release-production.yml contains forbidden trigger: ${forbidden}`);
}

console.log(`Repository policy guard passed: ${workflowFiles.join(', ')}`);
