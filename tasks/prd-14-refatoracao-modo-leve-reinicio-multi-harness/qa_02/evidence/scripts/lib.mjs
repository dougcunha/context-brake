import { spawn } from 'node:child_process';
import { appendFile, copyFile, mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPO = 'D:/MyProjects/ContextBrake';
export const CLI = `${REPO}/dist/src/cli/main.js`;
export const FIX = `${REPO}/tests/fixtures/harnesses`;
export const EVIDENCE = `${REPO}/tasks/prd-14-refatoracao-modo-leve-reinicio-multi-harness/qa_02/evidence`;
export const SCRATCH = 'C:/Users/Admin/AppData/Local/Temp/claude/D--MyProjects-ContextBrake/64f4bd2d-a5cb-4b5c-ba0a-6ee780da4b28/scratchpad/qa2/runs';
const GIT_DIR = 'C:/Users/Admin/scoop/apps/git/2.56.0.2/ucrt64/bin';
const NODE_DIR = dirname(process.execPath);

export const FIXTURE_FILES = {
  'claude-code': [['claude-code/user-settings.json', '.claude/settings.json']],
  'codex-cli': [['codex-cli/user-hooks.json', '.codex/hooks.json']],
  cursor: [['cursor/user-hooks.json', '.cursor/hooks.json']],
  'github-copilot-cli': [['github-copilot-cli/settings.json', '.github/copilot/settings.json']],
  pi: [['pi/settings.json', '.pi/settings.json']],
  'oh-my-pi': [['oh-my-pi/config.yml', '.omp/config.yml']],
  opencode: [['opencode/opencode.json', 'opencode.json']],
  'antigravity-cli': [['antigravity-cli/user-hooks.json', '.agents/hooks.json']],
};

export const results = [];
export function check(scenario, name, ok, detail = '') {
  results.push({ scenario, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${scenario}] ${name}${ok ? '' : ` :: ${detail}`}`);
}

export function env(repo, extra = {}) {
  return {
    PATH: `${NODE_DIR};${GIT_DIR}`, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
    HOME: repo.home, USERPROFILE: repo.home, NO_COLOR: '1', ...extra,
  };
}

export async function makeRepo(label, harnesses) {
  await mkdir(SCRATCH, { recursive: true });
  const base = await mkdtemp(join(SCRATCH, `${label}-`));
  const root = join(base, 'repo');
  const home = join(base, 'home');
  await mkdir(root, { recursive: true });
  await mkdir(home, { recursive: true });
  const repo = { base, root, home, label };
  await run(repo, 'git', ['init', '-q'], { log: false });
  for (const harness of harnesses) {
    for (const [from, to] of FIXTURE_FILES[harness]) {
      await mkdir(dirname(join(root, to)), { recursive: true });
      await copyFile(join(FIX, from), join(root, to));
    }
  }
  return repo;
}

export function run(repo, cmd, args, { stdin = '', extraEnv = {}, log = true, evidence = null, cwd = repo.root } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: env(repo, extraEnv), stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.stdin.end(stdin);
    child.on('close', async (code) => {
      if (log && evidence !== null) {
        const envText = Object.keys(extraEnv).length > 0 ? ` env=${JSON.stringify(extraEnv)}` : '';
        await appendFile(join(EVIDENCE, evidence), `\n$ (cwd=${relative(repo.base, cwd) || '.'}${envText}) ${cmd === process.execPath ? 'node' : cmd} ${args.map((a) => a.replace(REPO, '<repo>').replace(repo.root.replaceAll('\\', '/'), '<fixture>')).join(' ')}${stdin ? `\n< stdin: ${stdin}` : ''}\nexit=${code}\n--- stdout\n${stdout}--- stderr\n${stderr}--- end\n`);
      }
      resolve({ code, stdout, stderr });
    });
  });
}

export function cli(repo, args, evidence, extraEnv = {}) {
  return run(repo, process.execPath, [CLI, ...args], { evidence, extraEnv });
}

export function hook(repo, hookRel, event, payload, evidence, extraEnv = {}) {
  return run(repo, process.execPath, [join(repo.root, hookRel), event], { stdin: JSON.stringify(payload), evidence, extraEnv, cwd: repo.root });
}

export async function tree(root, dir = root) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    if (entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await tree(root, full));
    else out.push(relative(root, full).replaceAll('\\', '/'));
  }
  return out.sort();
}

export async function note(evidence, text) {
  await appendFile(join(EVIDENCE, evidence), `\n# ${text}\n`);
}

export async function exists(path) {
  return stat(path).then(() => true, () => false);
}

export async function read(path) {
  return readFile(path, 'utf8').catch(() => null);
}

export async function write(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, 'utf8');
}

export async function schemas() {
  const diag = await import(pathToFileURL(`${REPO}/dist/src/core/contracts/diagnostics.js`).href);
  return diag;
}
