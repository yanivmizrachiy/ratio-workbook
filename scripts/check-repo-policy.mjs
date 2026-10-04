import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
const required = ['verify-preview.yml', 'release-production.yml'];

if (!fs.existsSync(workflowsDir)) throw new Error('Missing .github/workflows');
const workflowFiles = fs.readdirSync(workflowsDir).filter((name) => /\.ya?ml$/i.test(name)).sort();
for (const name of required) {
  if (!workflowFiles.includes(name)) throw new Error(`Missing canonical workflow: ${name}`);
}
if (workflowFiles.length !== required.length) {
  throw new Error(`Unexpected workflow file(s): ${workflowFiles.filter((name) => !required.includes(name)).join(', ')}`);
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
  for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+).*$/gm)) {
    const ref = match[1];
    if (ref.startsWith('./')) continue;
    const at = ref.lastIndexOf('@');
    const revision = at >= 0 ? ref.slice(at + 1) : '';
    if (!/^[0-9a-f]{40}$/i.test(revision)) {
      throw new Error(`GitHub Action must be pinned to an immutable 40-char commit SHA in ${name}: ${ref}`);
    }
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

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of tracked) {
  if (/^(?:preview|dist|node_modules)\//.test(file)) throw new Error(`Generated directory must not be tracked: ${file}`);
  if (/(^|\/)\.env(?:\.|$)/.test(file)) throw new Error(`Environment file must not be tracked: ${file}`);
  if (/\.(?:pem|key|p12|pfx)$/i.test(file)) throw new Error(`Sensitive key/certificate file must not be tracked: ${file}`);
  if (/(?:\.bak|\.tmp|~)$/i.test(file)) throw new Error(`Backup/temp file must not be tracked: ${file}`);
  if (/^deploy-trigger-.*\.txt$/i.test(file)) throw new Error(`Obsolete deployment trigger artifact must not be tracked: ${file}`);
}

const scanFiles = tracked.filter((file) => /^(?:src|scripts|\.github\/workflows)\//.test(file) && /\.(?:[cm]?[jt]sx?|py|ya?ml|css|json)$/i.test(file) && file !== 'scripts/check-repo-policy.mjs');
const secretPatterns = [
  ['OpenAI-style API key', /sk-[A-Za-z0-9_-]{20,}/],
  ['GitHub classic token', /gh[pousr]_[A-Za-z0-9]{20,}/],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{20,}/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
];
const privatePathPatterns = [
  ['Windows user path', /[A-Za-z]:\\Users\\[^\\\s]+/],
  ['macOS user path', /\/Users\/[^/\s]+/],
  ['Linux home path', /\/home\/[^/\s]+/],
];
for (const file of scanFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const [label, pattern] of [...secretPatterns, ...privatePathPatterns]) {
    if (pattern.test(text)) throw new Error(`${label} detected in tracked source: ${file}`);
  }
}

console.log(`Repository policy guard passed: workflows=${workflowFiles.join(', ')}, tracked=${tracked.length}, scanned=${scanFiles.length}`);
