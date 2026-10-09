import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const REPO = 'D:/MyProjects/ContextBrake';
export const CLI = `${REPO}/dist/src/cli/main.js`;
export const EVIDENCE = `${REPO}/tasks/prd-17-ignorar-arquivos-do-contextbrake-no-git/qa_01/evidence`;
export const RUNS = process.env.QA_RUNS;
export const FAKE_HOME = join(RUNS, 'fake-home');
mkdirSync(FAKE_HOME, { recursive: true });
export const START = '# >>> context-brake (managed by `context-brake init`; do not edit) >>>';
export const END = '# <<< context-brake <<<';

const baseEnv = { ...process.env, NO_COLOR: '1', HOME: FAKE_HOME, USERPROFILE: FAKE_HOME, GIT_CONFIG_GLOBAL: join(FAKE_HOME, '.gitconfig'), GIT_AUTHOR_NAME: 'qa', GIT_AUTHOR_EMAIL: 'qa@example.invalid', GIT_COMMITTER_NAME: 'qa', GIT_COMMITTER_EMAIL: 'qa@example.invalid' };
delete baseEnv.FORCE_COLOR;

let logFile = null;
export function scenario(name) { logFile = join(EVIDENCE, `${name}.log`); writeFileSync(logFile, `# ${name}\n`); }
export function log(text) { appendFileSync(logFile, `${text}\n`); }
const results = [];
export function check(id, ok, detail = '') { results.push({ id, ok }); log(`CHECK ${ok ? 'PASS' : 'FAIL'} ${id}${detail ? ` :: ${detail}` : ''}`); console.log(`${ok ? 'PASS' : 'FAIL'} ${id}${detail && !ok ? ` :: ${detail}` : ''}`); }
export function summary() { const failed = results.filter((r) => !r.ok); console.log(`TOTAL ${results.length} FAILED ${failed.length}`); return failed.length; }

export function cb(cwd, args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, env: baseEnv, encoding: 'utf8' });
  log(`\n$ (cwd=${cwd}) NO_COLOR=1 node dist/src/cli/main.js ${args.join(' ')}\nexit=${r.status}\n--- stdout ---\n${r.stdout}--- stderr ---\n${r.stderr}--- end ---`);
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json: tryJson(r.stdout) };
}
function tryJson(text) { try { return JSON.parse(text); } catch { return null; } }
export function git(cwd, args, quiet = false) {
  const r = spawnSync('git', args, { cwd, env: baseEnv, encoding: 'utf8' });
  if (!quiet) log(`\n$ git ${args.join(' ')}\nexit=${r.status}\n${r.stdout}${r.stderr}`);
  return r.stdout;
}
export function newRepo(name, { gitInit = true, gitignore = undefined, claude = true, codex = false } = {}) {
  const dir = mkdtempSync(join(RUNS, `${name}-`));
  if (gitInit) git(dir, ['init', '-q', '-b', 'main']);
  if (claude) { mkdirSync(join(dir, '.claude')); writeFileSync(join(dir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n'); }
  if (codex) { mkdirSync(join(dir, '.codex')); }
  if (gitignore !== undefined) writeFileSync(join(dir, '.gitignore'), gitignore);
  log(`fixture ${dir} git=${gitInit} claude=${claude} codex=${codex} gitignore=${JSON.stringify(gitignore)}`);
  return dir;
}
export function read(dir, rel) { const p = join(dir, rel); return existsSync(p) ? readFileSync(p, 'utf8') : null; }
export function readBytes(dir, rel) { const p = join(dir, rel); return existsSync(p) ? readFileSync(p) : null; }
export function blockLines(text) {
  if (text === null) return null;
  const lines = text.split(/\r?\n/);
  const s = lines.indexOf(START); const e = lines.indexOf(END);
  if (s < 0 || e < 0) return null;
  return lines.slice(s + 1, e);
}
export function outsideBlock(text) {
  const s = text.indexOf(START); const eIdx = text.indexOf(END);
  if (s < 0) return text;
  return { before: text.slice(0, s), after: text.slice(eIdx + END.length) };
}
export function manifestOwned(dir) {
  const m = JSON.parse(read(dir, '.context-brake/manifest.json'));
  return m;
}
