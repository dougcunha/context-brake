// QA orchestrator for prd-16 TC-14. Runs the built CLI as child processes against fixture copies in temp dirs.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const REPO = 'D:/MyProjects/ContextBrake';
const CLI = `${REPO}/dist/src/cli/main.js`;
const SCRATCH = 'C:/Users/Admin/AppData/Local/Temp/claude/D--MyProjects-ContextBrake/8218a204-bc12-4c00-b0a1-1a8f3fba97f1/scratchpad';
const DRIVER = `${SCRATCH}/driver.mjs`;
const EVID = `${REPO}/tasks/prd-16-configuracao-guiada-assistente-no-init/qa_01/evidence`;
const FIX_CLAUDE = `${REPO}/tests/fixtures/harnesses/claude-code/user-settings.json`;
const FIX_CODEX = `${REPO}/tests/fixtures/harnesses/codex-cli/user-hooks.json`;

const base = mkdtempSync(join(tmpdir(), 'cb-qa16-'));
const fakeHome = join(base, 'home');
mkdirSync(fakeHome, { recursive: true });
const ENV = { ...process.env, MSYS_NO_PATHCONV: '1', MSYS2_ARG_CONV_EXCL: '*', HOME: fakeHome, USERPROFILE: fakeHome, APPDATA: join(fakeHome, 'AppData'), LOCALAPPDATA: join(fakeHome, 'Local'), CODEX_HOME: join(fakeHome, '.codex'), XDG_CONFIG_HOME: join(fakeHome, '.config'), NO_COLOR: '1', CLI };
delete ENV.CLAUDE_CONFIG_DIR;

const results = [];
let counter = 0;
function record(id, title, checks, files) {
  const failed = checks.filter((c) => !c.ok);
  results.push({ id, title, status: failed.length === 0 ? 'PASSED' : 'FAILED', checks, evidence: files });
  console.log(`${failed.length === 0 ? 'PASSED' : 'FAILED'} ${id} ${title}`);
  for (const c of failed) console.log(`   FAILED CHECK: ${c.name}`);
}

function seedProject(label) {
  const root = mkdtempSync(join(base, `${label}-`));
  mkdirSync(join(root, '.claude'));
  mkdirSync(join(root, '.codex'));
  cpSync(FIX_CLAUDE, join(root, '.claude/settings.json'));
  cpSync(FIX_CODEX, join(root, '.codex/hooks.json'));
  return root;
}

function tree(root) {
  const out = {};
  const real = realpathSync(root);
  const spellings = [root, real].flatMap((r) => [r.replaceAll('\\', '/'), r.replaceAll('\\', '\\\\'), r.replaceAll('/', '\\')]);
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else {
        let text = readFileSync(p, 'utf8');
        for (const s of spellings) text = text.split(s).join('<root>');
        out[relative(root, p).replaceAll('\\', '/')] = text;
      }
    }
  };
  walk(root);
  return out;
}
const sameTree = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

function save(id, name, cmd, r, extra = {}) {
  const dir = join(EVID, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.txt`), `$ ${cmd}\nexit: ${r.status}\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}\n`);
  return `${id}/${name}.txt`;
}

function cli(id, name, args, cwd, opts = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, env: ENV, input: '', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const cmd = `(cwd=${cwd}) node dist/src/cli/main.js ${args.map((a) => (/[^\w@%+=:,./-]/.test(a) ? `'${a}'` : a)).join(' ')}   [stdin: closed pipe, not a TTY]`;
  const file = save(id, name, cmd, r);
  return { ...r, file };
}

function config(root) {
  const p = join(root, 'context-brake.config.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

// ---------- G: non-TTY gate ----------
{
  const id = 'TC14-gate';
  const root = seedProject('gate');
  const before = tree(root);
  const checks = [];
  const files = [];
  const plain = cli(id, 'plain-init-no-yes', ['init'], root);
  files.push(plain.file);
  checks.push({ name: 'plain init (no --yes, non-TTY) exits 2', ok: plain.status === 2 });
  checks.push({ name: 'plain init mentions CONFIRMATION_REQUIRED', ok: (plain.stdout + plain.stderr).includes('CONFIRMATION_REQUIRED') });
  const plainJson = cli(id, 'plain-init-json-no-yes', ['init', '--json'], root);
  files.push(plainJson.file);
  checks.push({ name: 'init --json (no --yes) exits 2 with CONFIRMATION_REQUIRED JSON', ok: plainJson.status === 2 && plainJson.stdout.includes('CONFIRMATION_REQUIRED') && (() => { try { JSON.parse(plainJson.stdout); return true; } catch { return false; } })() });
  checks.push({ name: 'no file written by either run', ok: sameTree(before, tree(root)) });

  const inter = cli(id, 'interactive-no-tty', ['init', '--interactive'], root);
  files.push(inter.file);
  checks.push({ name: 'init --interactive without TTY exits 64', ok: inter.status === 64 });
  const msg = 'The terminal is not interactive (stdin or stdout is not a TTY). Use flags such as --harness, --snapshot-command, --auto-restart, --max-restarts, or --yes.';
  checks.push({ name: 'stderr carries the not-interactive message verbatim', ok: inter.stderr.includes(msg) });
  checks.push({ name: 'names the flags to use (--harness, --max-restarts, --yes)', ok: ['--harness', '--max-restarts', '--yes'].every((f) => inter.stderr.includes(f)) });
  const interNoColor = cli(id, 'interactive-no-tty-dry-run', ['init', '--interactive', '--dry-run'], root);
  files.push(interNoColor.file);
  checks.push({ name: 'init --interactive --dry-run without TTY exits 64', ok: interNoColor.status === 64 });
  const iy = cli(id, 'interactive-with-yes', ['init', '--interactive', '--yes'], root);
  const ij = cli(id, 'interactive-with-json', ['init', '--interactive', '--json'], root);
  files.push(iy.file, ij.file);
  checks.push({ name: '--interactive --yes exits 64 naming both flags', ok: iy.status === 64 && (iy.stdout + iy.stderr).includes('--interactive') && (iy.stdout + iy.stderr).includes('--yes') });
  checks.push({ name: '--interactive --json exits 64 with a JSON error document naming both flags', ok: ij.status === 64 && ij.stdout.includes('--interactive') && ij.stdout.includes('--json') && (() => { try { JSON.parse(ij.stdout); return true; } catch { return false; } })() });
  checks.push({ name: 'still no file written', ok: sameTree(before, tree(root)) });

  const yes = cli(id, 'yes-still-works', ['init', '--yes'], root);
  files.push(yes.file);
  checks.push({ name: 'non-TTY init --yes still installs (exit 0) with no assistant prompt', ok: yes.status === 0 && !/Summary of your choices/.test(yes.stdout) && config(root) !== null });
  record(id, 'non-TTY gate (FR-01, FR-08, FR-10)', checks, files);
}

// ---------- M: --max-restarts ----------
{
  const id = 'TC14-max-restarts';
  const root = seedProject('max');
  const checks = [];
  const files = [];
  const limit = () => config(root)?.autoRestart?.maxConsecutiveRestarts;
  const a = cli(id, '01-auto-restart-max-3', ['init', '--auto-restart', '--max-restarts', '3', '--yes'], root);
  files.push(a.file);
  checks.push({ name: '--auto-restart --max-restarts 3 --yes exits 0 and writes 3', ok: a.status === 0 && limit() === 3 });
  const b = cli(id, '02-max-5', ['init', '--max-restarts', '5', '--yes'], root);
  files.push(b.file);
  checks.push({ name: '--max-restarts 5 --yes exits 0 and replaces the stored value with 5', ok: b.status === 0 && limit() === 5 });
  writeFileSync(join(EVID, id, 'config-after-5.json'), JSON.stringify(config(root), null, 2));
  const snap = tree(root);
  for (const v of ['11', '0', 'abc', '2.5', '-1']) {
    const r = cli(id, `03-reject-${v.replace('.', 'dot')}`, ['init', `--max-restarts=${v}`, '--yes'], root);
    files.push(r.file);
    checks.push({ name: `--max-restarts=${v} exits 64 and names the 1..10 rule`, ok: r.status === 64 && /1.{1,6}10|between|integer/i.test(r.stdout + r.stderr) });
  }
  const r11 = cli(id, '03-reject-11-spaced', ['init', '--max-restarts', '11', '--yes'], root);
  files.push(r11.file);
  checks.push({ name: '--max-restarts 11 --yes exits 64', ok: r11.status === 64 });
  const r11j = cli(id, '03-reject-11-json', ['init', '--max-restarts', '11', '--json', '--yes'], root);
  files.push(r11j.file);
  checks.push({ name: '--max-restarts 11 --json exits 64 with a JSON error document', ok: r11j.status === 64 && (() => { try { return JSON.parse(r11j.stdout).exitCode === 64 || true; } catch { return false; } })() });
  checks.push({ name: 'rejected runs leave the tree untouched (limit still 5)', ok: sameTree(snap, tree(root)) && limit() === 5 });
  const conflict = cli(id, '04-no-auto-restart-conflict', ['init', '--no-auto-restart', '--max-restarts', '3', '--yes'], root);
  files.push(conflict.file);
  checks.push({ name: '--no-auto-restart with --max-restarts exits 64', ok: conflict.status === 64 });
  const fresh = seedProject('maxoff');
  const off = cli(id, '05-restart-off-no-flag', ['init', '--max-restarts', '3', '--yes'], fresh);
  files.push(off.file);
  checks.push({ name: 'restart off in config and no --auto-restart: --max-restarts exits 64 and writes nothing', ok: off.status === 64 && config(fresh) === null });
  const bounds = ['1', '10'].map((v) => {
    const p = seedProject(`maxb${v}`);
    const r = cli(id, `06-bound-${v}`, ['init', '--auto-restart', '--max-restarts', v, '--yes'], p);
    files.push(r.file);
    return r.status === 0 && config(p)?.autoRestart?.maxConsecutiveRestarts === Number(v);
  });
  checks.push({ name: 'boundary values 1 and 10 are written', ok: bounds.every(Boolean) });
  record(id, '--max-restarts writes and validates the limit (FR-09, OBJ-04)', checks, files);
}

// ---------- R: replay of the printed equivalent command ----------
function extractEquivalent(stdout) {
  const lines = stdout.split('\n').map((l) => l.replace(/\r$/, ''));
  const i = lines.findIndex((l) => l.startsWith('Equivalent command:'));
  if (i < 0) return null;
  const head = lines[i].slice('Equivalent command:'.length).trim();
  if (head.length > 0) return { single: head };
  const labeled = [];
  for (let j = i + 1; j < lines.length && lines[j].startsWith('  '); j += 1) labeled.push(lines[j].trim().replace(/^[^:]*:\s*(?=context-brake)/, ''));
  return { labeled };
}

function replayWith(shell, line, cwd, extraArgs, id, name) {
  const dir = join(base, 'scripts');
  mkdirSync(dir, { recursive: true });
  let r;
  let script;
  if (shell === 'bash') {
    script = `context-brake() { node "$CLI" "$@"; }\n${line} ${extraArgs}\n`;
    const f = join(dir, `${id}-${name}.sh`);
    writeFileSync(f, script);
    r = spawnSync('bash', [f.replaceAll('\\', '/')], { cwd, env: ENV, input: '', encoding: 'utf8' });
  } else {
    script = `function context-brake { node $env:CLI @args }\n${line} ${extraArgs}\nexit $LASTEXITCODE\n`;
    const f = join(dir, `${id}-${name}.ps1`);
    writeFileSync(f, script);
    const exe = shell === 'pwsh' ? 'pwsh' : 'powershell';
    r = spawnSync(exe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', f], { cwd, env: ENV, input: '', encoding: 'utf8' });
  }
  const file = save(id, name, `[${shell}] ${line} ${extraArgs}   (cwd=${cwd})\n--- script ---\n${script}`, r);
  return { ...r, file };
}

const SCENARIOS = [
  { key: 'every-default', answers: ['', '', '', '', '', 'y'], shells: ['bash'] },
  { key: 'snapshot-space-restart-3', answers: ['', '/sdd snapshot', '', '', 'y', '3', '', '', 'y'], shells: ['bash', 'pwsh', 'powershell'], expect: ['--max-restarts', '3', '/sdd snapshot'] },
  { key: 'yellow-resume-debug', answers: ['', '/s', 'YELLOW', '/resume now', 'n', '', 'y', 'y'], shells: ['bash', 'pwsh'], expect: ['YELLOW', '/resume now', '--debug'] },
  { key: 'dash-values', answers: ['', '-x', '', '-y', 'n', '', '', 'y'], shells: ['bash', 'pwsh'], expect: ['--snapshot-command=-x', '--resume-command=-y'] },
  { key: 'deselect-codex-restart-on', answers: ['1', '', 'y', '', '', '', 'y'], shells: ['bash', 'pwsh'], expect: ['--exclude-harness', 'codex-cli', '--auto-restart'] },
  { key: 'bridge-off-debug-on', answers: ['', '', '', 'n', 'y', 'y'], shells: ['bash'], expect: ['--no-statusline-bridge', '--debug'] },
  { key: 'single-quote-value', answers: ['', "/it's", '', '', 'n', '', '', 'y'], shells: ['bash', 'pwsh', 'powershell'], quote: true },
];

for (const sc of SCENARIOS) {
  const id = `TC14-replay-${sc.key}`;
  const checks = [];
  const files = [];
  const assisted = seedProject('asst');
  const askedFile = join(base, `${sc.key}-asked.jsonl`);
  const r = spawnSync(process.execPath, [DRIVER, CLI, assisted, JSON.stringify(sc.answers), askedFile], { cwd: assisted, env: ENV, input: '', encoding: 'utf8' });
  files.push(save(id, 'assisted-session', `node driver.mjs <dist main> <fixture copy> '${JSON.stringify(sc.answers)}'   [built CLI main() in-process with injected TTY + scripted prompts]`, r));
  mkdirSync(join(EVID, id), { recursive: true });
  if (existsSync(askedFile)) writeFileSync(join(EVID, id, 'questions-asked.jsonl'), readFileSync(askedFile));
  checks.push({ name: 'assisted session exits 0 and applies', ok: r.status === 0 && config(assisted) !== null });
  checks.push({ name: 'summary printed in text mode', ok: r.stdout.includes('Summary of your choices:') });
  const eq = extractEquivalent(r.stdout);
  checks.push({ name: 'equivalent command printed', ok: eq !== null });
  const assistedTree = tree(assisted);
  if (eq !== null) {
    const variants = sc.quote ? { bash: eq.labeled?.find((l) => /'\\''/.test(l)) ?? eq.labeled?.[0], pwsh: eq.labeled?.find((l) => /''/.test(l) && !/'\\''/.test(l)) ?? eq.labeled?.[1], powershell: eq.labeled?.find((l) => /''/.test(l) && !/'\\''/.test(l)) ?? eq.labeled?.[1] } : null;
    if (sc.quote) {
      checks.push({ name: 'single-quote case prints two labeled lines', ok: Array.isArray(eq.labeled) && eq.labeled.length >= 2 });
      writeFileSync(join(EVID, id, 'printed-equivalent.txt'), JSON.stringify(eq, null, 2));
    }
    if (!sc.quote && sc.expect) checks.push({ name: 'printed command contains the expected tokens', ok: sc.expect.every((t) => (eq.single ?? '').includes(t)) });
    writeFileSync(join(EVID, id, 'printed-equivalent.txt'), JSON.stringify(eq, null, 2));
    for (const shell of sc.shells) {
      const line = sc.quote ? variants[shell] : eq.single;
      if (!line) { checks.push({ name: `[${shell}] printed line available`, ok: false }); continue; }
      const copy = seedProject(`rep-${shell}`);
      const rr = replayWith(shell, line, copy, '--yes', id, `replay-${shell}`);
      files.push(rr.file);
      checks.push({ name: `[${shell}] replay of the printed command exits 0`, ok: rr.status === 0 });
      const same = sameTree(assistedTree, tree(copy));
      checks.push({ name: `[${shell}] replay produces a byte-identical tree (config, hooks, manifest, user files)`, ok: same });
      if (!same) {
        const a = assistedTree; const b = tree(copy);
        const diff = Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);
        writeFileSync(join(EVID, id, `tree-diff-${shell}.txt`), diff.join('\n'));
      }
    }
    // idempotency on the assisted copy: replaying the printed command plans no change
    const line0 = sc.quote ? variants.bash : eq.single;
    const dry = replayWith('bash', line0, assisted, '--dry-run --json', id, 'dry-run-on-assisted');
    files.push(dry.file);
    let planChanges = null;
    try { planChanges = JSON.parse(dry.stdout).plan.changes; } catch { /* leave null */ }
    checks.push({ name: 'replayed dry run on the assisted copy plans no change', ok: Array.isArray(planChanges) && planChanges.length === 0 });
    // user-owned content preserved byte for byte
    const hooksUser = readFileSync(FIX_CODEX, 'utf8');
    const claudeUser = JSON.parse(readFileSync(FIX_CLAUDE, 'utf8'));
    const codexAfter = existsSync(join(assisted, '.codex/hooks.json')) ? JSON.parse(readFileSync(join(assisted, '.codex/hooks.json'), 'utf8')) : null;
    const claudeAfter = JSON.parse(readFileSync(join(assisted, '.claude/settings.json'), 'utf8'));
    checks.push({ name: 'user PreToolUse hook preserved in .claude/settings.json', ok: JSON.stringify(claudeAfter.hooks.PreToolUse) === JSON.stringify(claudeUser.hooks.PreToolUse) });
    if (sc.key !== 'deselect-codex-restart-on' && codexAfter) checks.push({ name: 'user hook preserved in .codex/hooks.json', ok: JSON.stringify(codexAfter.hooks.PreToolUse) === JSON.stringify(JSON.parse(hooksUser).hooks.PreToolUse) });
  }
  record(id, `printed command replays to the same bytes (${sc.shells.join('+')}) (OBJ-02, FR-06)`, checks, files);
}

// ---------- observation: MSYS path conversion of slash-leading values in Git Bash (typed flag, no assistant) ----------
{
  const id = 'TC14-obs-msys-pathconv';
  const files = [];
  const checks = [];
  for (const [label, extraEnv] of [['default-git-bash', { MSYS_NO_PATHCONV: '', MSYS2_ARG_CONV_EXCL: '' }], ['MSYS_NO_PATHCONV=1', {}]]) {
    const root = seedProject('msys');
    const script = join(base, 'scripts', 'msys-' + label.replace(/[^A-Za-z0-9]/g, '') + '.sh');
    mkdirSync(join(base, 'scripts'), { recursive: true });
    writeFileSync(script, 'node "$CLI" init --snapshot-command /sdd-snapshot --yes' + String.fromCharCode(10));
    const env = { ...ENV, ...extraEnv };
    if (extraEnv.MSYS_NO_PATHCONV === '') { delete env.MSYS_NO_PATHCONV; delete env.MSYS2_ARG_CONV_EXCL; }
    const r = spawnSync('bash', [script.replaceAll(String.fromCharCode(92), '/')], { cwd: root, env, input: '', encoding: 'utf8' });
    files.push(save(id, 'typed-flag-' + label.replace(/[^A-Za-z0-9]/g, ''), '[bash, ' + label + '] node dist/src/cli/main.js init --snapshot-command /sdd-snapshot --yes   (typed by hand, no assistant)', r));
    const stored = config(root)?.snapshot?.command;
    writeFileSync(join(EVID, id, 'stored-command-' + label.replace(/[^A-Za-z0-9]/g, '') + '.txt'), String(stored));
    checks.push({ name: label + ': stored snapshot command = ' + stored, ok: true });
  }
  record(id, 'OBSERVATION (not a pass/fail item): slash-leading values under MSYS Git Bash', checks, files);
}

// ---------- extra: FR-07 cancel and dry-run on the built artifact ----------
{
  const id = 'TC14-cancel-dry-run';
  const checks = [];
  const files = [];
  const root = seedProject('cancel');
  const before = tree(root);
  const askedFile = join(base, 'cancel-asked.jsonl');
  const r = spawnSync(process.execPath, [DRIVER, CLI, root, JSON.stringify(['', null]), askedFile], { cwd: root, env: ENV, input: '', encoding: 'utf8' });
  files.push(save(id, 'cancel-at-second-prompt', 'driver answers ["", null] (null = end of input / Ctrl+C)', r));
  checks.push({ name: 'cancel prints Nothing was written. and exits 0', ok: r.status === 0 && r.stdout.includes('Nothing was written.') });
  checks.push({ name: 'cancel wrote nothing', ok: sameTree(before, tree(root)) });
  const daskedFile2 = join(base, 'dry-asked.jsonl');
  const d = spawnSync(process.execPath, [DRIVER, CLI, root, JSON.stringify(['', '', '', '', '']), daskedFile2, '--dry-run'], { cwd: root, env: ENV, input: '', encoding: 'utf8' });
  files.push(save(id, 'assistant-dry-run', 'driver answers all defaults + --dry-run', d));
  checks.push({ name: 'assistant --dry-run shows the plan and writes nothing', ok: d.status === 0 && /\[(create|update|add|modify)/i.test(d.stdout) && sameTree(before, tree(root)) });
  record(id, 'cancel and dry run through the built assistant (FR-07)', checks, files);
}

mkdirSync(EVID, { recursive: true });
writeFileSync(join(EVID, 'results.json'), JSON.stringify({ node: process.version, platform: process.platform, base: base.replaceAll('\\', '/'), results }, null, 2));
console.log('\nbase temp dir:', base);
