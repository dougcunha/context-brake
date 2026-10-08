import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const REPO = 'D:/MyProjects/ContextBrake';
const CLI = path.join(REPO, 'dist/src/cli/main.js');
const FEATURE = path.join(REPO, 'tasks/prd-15-configuracao-guiada-higiene-e-exclusao');
const EVID = path.join(FEATURE, 'qa_01/evidence');
fs.mkdirSync(EVID, { recursive: true });

const diag = await import(pathToFileURL(path.join(REPO, 'dist/src/core/contracts/diagnostics.js')).href);
const conf = await import(pathToFileURL(path.join(REPO, 'dist/src/core/contracts/configuration.js')).href);
const require = createRequire(path.join(REPO, 'package.json'));
const Ajv = require('ajv');
function ajvFor(file) {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO, 'schemas', file), 'utf8'));
  delete schema.$schema;
  return new Ajv({ allErrors: true, unknownFormats: 'ignore' }).compile(schema);
}
const ajvDoctor = ajvFor('doctor-report.schema.json');
const ajvInstall = ajvFor('install-report.schema.json');
const ajvConfig = ajvFor('context-brake.config.schema.json');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-qa01-'));
const HOME = path.join(ROOT, 'home');
fs.mkdirSync(HOME);
let seq = 0;
const results = [];
let symlinkOk = true;
let symlinkReason = '';

function check(id, name, ok, detail = '') {
  results.push({ id, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? ' :: ' + detail : ''}`);
}
function note(id, name, detail) {
  results.push({ id, name, ok: null, detail });
  console.log(`NOTE ${id} ${name} :: ${detail}`);
}
function tryParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}
function run(label, dir, args) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: dir, encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', HOME, USERPROFILE: HOME, APPDATA: path.join(HOME, 'AppData'), LOCALAPPDATA: path.join(HOME, 'Local') },
  });
  const id = String(++seq).padStart(2, '0') + '-' + label;
  fs.writeFileSync(path.join(EVID, id + '.txt'),
    `$ node dist/src/cli/main.js ${args.join(' ')}\ncwd: <temporary fixture copy outside the worktree>\nenv: NO_COLOR=1, HOME/USERPROFILE redirected to an empty temporary directory\nexit: ${r.status}\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}\n`);
  const json = tryParse(r.stdout) ?? tryParse(r.stderr);
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json, id };
}
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };
const sha = (t) => createHash('sha256').update(t).digest('hex');
function treeHash(dir) {
  const out = {};
  const walk = (d, rel) => {
    for (const name of fs.readdirSync(d)) {
      if (rel === '' && name === '.git') continue;
      const full = path.join(d, name);
      const r = rel ? rel + '/' + name : name;
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) out[r] = 'link:' + fs.readlinkSync(full);
      else if (st.isDirectory()) walk(full, r);
      else out[r] = sha(fs.readFileSync(full));
    }
  };
  walk(dir, '');
  return out;
}
const sameTree = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function pad(text, n) { return text.split('\n').map((l) => ' '.repeat(n) + l).join('\n'); }
const block = (obj, indent) => pad(JSON.stringify(obj, null, 2), indent);
const stringify = (o) => JSON.stringify(o, null, 2) + '\n';
const validDoctor = (j) => { try { diag.doctorReportSchema.parse(j); } catch (e) { return 'zod: ' + e.message.slice(0, 200); } return ajvDoctor(j) ? true : 'ajv: ' + JSON.stringify(ajvDoctor.errors).slice(0, 300); };
const validInstall = (j) => { try { diag.installReportSchema.parse(j); } catch (e) { return 'zod: ' + e.message.slice(0, 200); } return ajvInstall(j) ? true : 'ajv: ' + JSON.stringify(ajvInstall.errors).slice(0, 300); };

const RETIRED_KEYS = ['stateStorage', 'instructionFiles', 'brake', 'lightMode', 'runner', 'telemetry.zones.legacy'];
const CONFIG = 'context-brake.config.json';

const ownedClaude = (event) => ({ type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs', event] });
const ownedCodex = (event) => ({ type: 'command', command: `git -c "alias.contextbrake=!node .codex/hooks/context-brake.mjs" contextbrake ${event}` });
const ownedCursor = (event) => ({ command: `node .cursor/hooks/context-brake.mjs ${event}` });
const foreignGuard = { type: 'command', command: 'echo foreign-guard' };
const foreignMixed = { type: 'command', command: 'echo foreign-mixed' };
const foreignNotify = { type: 'command', command: 'echo foreign-notify' };

function buildFixture(label) {
  const dir = path.join(ROOT, label);
  fs.mkdirSync(dir);
  spawnSync('git', ['init', '-q'], { cwd: dir });
  fs.mkdirSync(path.join(dir, '.agents'));
  try {
    fs.symlinkSync('.agents', path.join(dir, '.claude'), 'dir');
  } catch (e) {
    symlinkOk = false;
    symlinkReason = String(e.message);
    fs.mkdirSync(path.join(dir, '.claude'));
  }
  fs.mkdirSync(path.join(dir, '.codex'));
  fs.mkdirSync(path.join(dir, '.cursor'));
  fs.writeFileSync(path.join(dir, 'opencode.json'), '{\n  "$schema": "https://opencode.ai/config.json"\n}\n');
  fs.writeFileSync(path.join(dir, 'package.json'), '{\n  "name": "tokenhound-like"\n}\n');
  const setup = run(`setup-${label}-init`, dir, ['init', '--yes']);
  if (setup.code !== 0) throw new Error('fixture init failed ' + setup.code);
  const info = { dir, label };
  info.config0 = read(path.join(dir, CONFIG));
  info.opencodeJson = read(path.join(dir, 'opencode.json'));
  info.opencodeAssetExisted = exists(path.join(dir, '.opencode/plugins/context-brake.js'));

  const claudeFile = path.join(dir, '.claude/settings.json');
  const installedClaude = JSON.parse(read(claudeFile));
  info.claudeCurrent = Object.keys(installedClaude.hooks);
  const cHooks = {
    PreToolUse: [{ matcher: 'Bash', hooks: [ownedClaude('PreToolUse')] }, { matcher: 'Write|Edit', hooks: [foreignGuard] }, { matcher: '*', hooks: [foreignMixed, ownedClaude('PreToolUse')] }],
    ...installedClaude.hooks,
    Notification: [{ matcher: '*', hooks: [foreignNotify] }],
    SubagentStop: [{ matcher: '*', hooks: [ownedClaude('SubagentStop')] }],
  };
  const cSettings = { permissions: { allow: ['Bash(ls:*)'] }, hooks: cHooks };
  fs.writeFileSync(claudeFile, stringify(cSettings));
  const cExpectHooks = { ...cHooks, PreToolUse: [cHooks.PreToolUse[1], { matcher: '*', hooks: [foreignMixed] }] };
  delete cExpectHooks.SubagentStop;
  info.claude = { file: claudeFile, before: stringify(cSettings), expectedAfterInit: stringify({ permissions: cSettings.permissions, hooks: cExpectHooks }),
    foreignBlocks: [block(cHooks.PreToolUse[1], 6), block(foreignMixed, 10), block(cHooks.Notification[0], 6)], current: info.claudeCurrent };
  const claudeForeignOnly = { permissions: cSettings.permissions, hooks: { PreToolUse: cExpectHooks.PreToolUse, Notification: cHooks.Notification } };
  info.claude.expectedAfterRemove = stringify(claudeForeignOnly);

  const codexFile = path.join(dir, '.codex/hooks.json');
  const installedCodex = JSON.parse(read(codexFile));
  const xHooks = {
    PreToolUse: [{ matcher: 'Bash', hooks: [ownedCodex('PreToolUse')] }, { matcher: 'Write|Edit', hooks: [foreignGuard] }, { matcher: '*', hooks: [foreignMixed, ownedCodex('PreToolUse')] }],
    ...installedCodex.hooks,
    Notification: [{ matcher: '*', hooks: [foreignNotify] }],
    PermissionRequest: [{ matcher: '*', hooks: [ownedCodex('PermissionRequest')] }],
  };
  fs.writeFileSync(codexFile, stringify({ hooks: xHooks }));
  const xExpectHooks = { ...xHooks, PreToolUse: [xHooks.PreToolUse[1], { matcher: '*', hooks: [foreignMixed] }] };
  delete xExpectHooks.PermissionRequest;
  info.codex = { file: codexFile, before: stringify({ hooks: xHooks }), expectedAfterInit: stringify({ hooks: xExpectHooks }), current: Object.keys(installedCodex.hooks),
    foreignBlocks: [block(xHooks.PreToolUse[1], 6), block(foreignMixed, 10), block(xHooks.Notification[0], 6)],
    expectedAfterRemove: stringify({ hooks: { PreToolUse: xExpectHooks.PreToolUse, Notification: xHooks.Notification } }) };

  const cursorFile = path.join(dir, '.cursor/hooks.json');
  const installedCursor = JSON.parse(read(cursorFile));
  const foreignCursor = { command: 'echo foreign-cursor', timeout: 5 };
  const foreignEdit = { command: 'echo foreign-after-edit' };
  const uHooks = {
    preToolUse: [ownedCursor('preToolUse'), foreignCursor],
    ...installedCursor.hooks,
    beforeShellExecution: [ownedCursor('beforeShellExecution')],
    afterFileEdit: [foreignEdit],
  };
  fs.writeFileSync(cursorFile, stringify({ version: 1, hooks: uHooks }));
  const uExpectHooks = { ...uHooks, preToolUse: [foreignCursor] };
  delete uExpectHooks.beforeShellExecution;
  info.cursor = { file: cursorFile, before: stringify({ version: 1, hooks: uHooks }), expectedAfterInit: stringify({ version: 1, hooks: uExpectHooks }), current: Object.keys(installedCursor.hooks),
    foreignBlocks: [block(foreignCursor, 6), block(foreignEdit, 6)],
    expectedAfterRemove: stringify({ version: 1, hooks: { preToolUse: [foreignCursor], afterFileEdit: [foreignEdit] } }) };

  const installedConfig = JSON.parse(info.config0);
  const earlier = { ...installedConfig, stateStorage: { path: '.context-brake/state' }, instructionFiles: ['AGENTS.md', 'CLAUDE.md'], brake: { enabled: true }, lightMode: true, runner: { maxRestarts: 3 } };
  earlier.telemetry = { ...installedConfig.telemetry, zones: { ...installedConfig.telemetry.zones, legacy: 1 } };
  const earlierText = stringify(earlier);
  fs.writeFileSync(path.join(dir, CONFIG), earlierText);
  const manifestPath = path.join(dir, '.context-brake/manifest.json');
  const manifest = JSON.parse(read(manifestPath));
  manifest.assets = manifest.assets.map((a) => (a.path === CONFIG ? { ...a, sha256: sha(earlierText) } : a));
  fs.writeFileSync(manifestPath, stringify(manifest));
  info.earlierConfigText = earlierText;
  fs.writeFileSync(path.join(EVID, `fixture-${label}-before-config.json`), earlierText);
  fs.writeFileSync(path.join(EVID, `fixture-${label}-before-claude-settings.json`), info.claude.before);
  fs.writeFileSync(path.join(EVID, `fixture-${label}-before-codex-hooks.json`), info.codex.before);
  fs.writeFileSync(path.join(EVID, `fixture-${label}-before-cursor-hooks.json`), info.cursor.before);
  return info;
}

function ownedRetired(fx) {
  const found = [];
  for (const key of ['claude', 'codex', 'cursor']) {
    const hooks = JSON.parse(read(fx[key].file)).hooks ?? {};
    for (const [event, value] of Object.entries(hooks)) {
      if (!fx[key].current.includes(event) && JSON.stringify(value).includes('context-brake')) found.push(`${key}:${event}`);
    }
  }
  return found;
}
function foreignKept(fx) {
  const missing = [];
  for (const key of ['claude', 'codex', 'cursor']) {
    const text = read(fx[key].file);
    for (const b of fx[key].foreignBlocks) if (!text.includes(b)) missing.push(`${key}: ${b.trim().split('\n')[1]?.trim()}`);
  }
  return missing;
}
function copyOut(name, src) { if (exists(src)) fs.writeFileSync(path.join(EVID, name), read(src)); }

const meta = { node: process.version, platform: `${process.platform} ${os.release()}`, arch: process.arch, root: ROOT };

// ================= Fixture A: scenarios 1-4 =================
const A = buildFixture('A');
check('SETUP', 'earlier-build fixture A built (init --yes, then config + hooks edited, manifest sha rewritten)', true, `symlink=${symlinkOk ? 'created' : 'unavailable: ' + symlinkReason}`);
if (symlinkOk) check('SETUP', '.claude is a symbolic link to .agents', fs.lstatSync(path.join(A.dir, '.claude')).isSymbolicLink() && fs.readlinkSync(path.join(A.dir, '.claude')) === '.agents');
const baseline = treeHash(A.dir);
check('SETUP', 'fixture carries owned retired entries before the run', ownedRetired(A).length === 6, ownedRetired(A).join(','));

// ---- Scenario 1: doctor
const d1 = run('s1-doctor-text', A.dir, ['doctor']);
const d1j = run('s1-doctor-json', A.dir, ['doctor', '--json']);
check('S1', 'doctor text exit code 2 (configuration error code)', d1.code === 2, `exit ${d1.code}`);
const d1text = d1.stdout + d1.stderr;
check('S1', 'doctor text names every retired key', RETIRED_KEYS.every((k) => d1text.includes(`${k} is not a recognized key`)), RETIRED_KEYS.filter((k) => !d1text.includes(`${k} is not a recognized key`)).join(','));
check('S1', 'doctor text carries remediation naming init --yes', /init --yes/.test(d1text));
check('S1', 'doctor --json exit code 2', d1j.code === 2, `exit ${d1j.code}`);
const v1 = d1j.json ? validDoctor(d1j.json) : 'no JSON';
check('S1', 'doctor --json validates (zod from built dist + published JSON Schema via ajv)', v1 === true, String(v1));
const f1 = d1j.json?.findings?.find((f) => f.code === 'INVALID_CONTEXTBRAKE_CONFIG');
check('S1', 'JSON finding INVALID_CONTEXTBRAKE_CONFIG severity error, message names all keys', !!f1 && f1.severity === 'error' && RETIRED_KEYS.every((k) => f1.message.includes(`${k} is not a recognized key`)), f1 ? JSON.stringify(f1).slice(0, 400) : 'missing');
check('S1', 'JSON finding remediation names init --yes', !!f1 && /init --yes/.test(f1.remediation ?? ''), f1?.remediation ?? '');
note('S1', 'doctor integrations still diagnosed', `integrations=${(d1j.json?.integrations ?? []).map((i) => i.harness).join(',')}`);
check('S1', 'doctor wrote nothing', sameTree(baseline, treeHash(A.dir)));

// ---- Scenario 2: init --dry-run
const i2 = run('s2-init-dry-run-text', A.dir, ['init', '--dry-run']);
const i2j = run('s2-init-dry-run-json', A.dir, ['init', '--dry-run', '--json']);
check('S2', 'init --dry-run text exit 0', i2.code === 0, `exit ${i2.code}`);
check('S2', 'init --dry-run --json exit 0', i2j.code === 0, `exit ${i2j.code}`);
const vi2 = i2j.json ? validInstall(i2j.json) : 'no JSON';
check('S2', 'init --dry-run --json validates', vi2 === true, String(vi2));
const cfgChange = i2j.json?.plan?.changes?.find((c) => c.path === CONFIG);
const summary = JSON.stringify(cfgChange?.preview ?? '');
check('S2', 'JSON config change preview names every key to drop', !!cfgChange && summary.includes('drop unrecognized keys') && RETIRED_KEYS.every((k) => summary.includes(k)), summary.slice(0, 400));
check('S2', 'text preview names every key to drop', i2.stdout.includes('drop unrecognized keys') && RETIRED_KEYS.every((k) => i2.stdout.includes(k)));
const planPaths = (i2j.json?.plan?.changes ?? []).map((c) => `${c.action ?? c.kind ?? ''}:${c.path}`);
note('S2', 'planned changes', planPaths.join(' | '));
check('S2', 'plan edits the three hook files (retired entries cleanup)', ['.claude/settings.json', '.codex/hooks.json', '.cursor/hooks.json'].every((p) => planPaths.some((x) => x.endsWith(p))));
check('S2', 'init --dry-run wrote nothing', sameTree(baseline, treeHash(A.dir)));
const i2c = run('s2-init-no-yes-no-tty', A.dir, ['init', '--json']);
check('S2', 'init without --yes in a non-TTY asks for confirmation (exit != 0) and writes nothing', i2c.code !== 0 && sameTree(baseline, treeHash(A.dir)), `exit ${i2c.code} ${JSON.stringify(i2c.json?.error ?? i2c.json?.code ?? '').slice(0, 150)}`);

// ---- Scenario 3: init --yes
const i3j = run('s3-init-yes-json', A.dir, ['init', '--yes', '--json']);
check('S3', 'init --yes --json exit 0', i3j.code === 0, `exit ${i3j.code}`);
check('S3', 'init --yes --json validates', (i3j.json ? validInstall(i3j.json) : 'no JSON') === true, String(i3j.json ? validInstall(i3j.json) : 'no JSON'));
const cfgAfter = tryParse(read(path.join(A.dir, CONFIG)));
const cfgZ = conf.configurationSchema.safeParse(cfgAfter);
check('S3', 'config validates against the strict schema (built dist) and the published JSON Schema', cfgZ.success && ajvConfig(cfgAfter), cfgZ.success ? JSON.stringify(ajvConfig.errors) : cfgZ.error.message.slice(0, 200));
check('S3', 'retired keys dropped, incl. nested telemetry.zones.legacy', !JSON.stringify(cfgAfter).match(/stateStorage|instructionFiles|"brake"|lightMode|"runner"|legacy/));
check('S3', 'recognized values unchanged (deep equal and byte equal to the config installed before the edit)', JSON.stringify(cfgAfter) === JSON.stringify(JSON.parse(A.config0)) && read(path.join(A.dir, CONFIG)) === A.config0);
check('S3', 'no owned retired-event entry remains in Claude, Codex, Cursor files', ownedRetired(A).length === 0, ownedRetired(A).join(','));
check('S3', 'foreign hook entries byte-identical (verbatim blocks present)', foreignKept(A).length === 0, foreignKept(A).join(' ; '));
for (const k of ['claude', 'codex', 'cursor']) {
  const got = read(A[k].file);
  check('S3', `${k} hook file equals the expected file byte for byte`, got === A[k].expectedAfterInit, got === A[k].expectedAfterInit ? '' : 'differs, see evidence');
  fs.writeFileSync(path.join(EVID, `s3-after-${k}.json`), got);
}
fs.writeFileSync(path.join(EVID, 's3-after-config.json'), read(path.join(A.dir, CONFIG)));
if (symlinkOk) {
  const st = fs.lstatSync(path.join(A.dir, '.claude'));
  check('S3', 'symlink .claude -> .agents intact and edit landed on the target', st.isSymbolicLink() && fs.readlinkSync(path.join(A.dir, '.claude')) === '.agents' && read(path.join(A.dir, '.agents/settings.json')) === A.claude.expectedAfterInit);
} else note('S3', 'symlink check skipped', symlinkReason);
check('S3', 'opencode.json (foreign) untouched', read(path.join(A.dir, 'opencode.json')) === A.opencodeJson);
const afterInit = treeHash(A.dir);
const i3b = run('s3-init-yes-dry-run-second-json', A.dir, ['init', '--yes', '--dry-run', '--json']);
check('S3', 'second init --yes --dry-run exit 0, plans no change', i3b.code === 0 && (i3b.json?.plan?.changes ?? ['x']).length === 0, `exit ${i3b.code}, changes=${i3b.json?.plan?.changes?.length}`);
check('S3', 'second dry run wrote nothing', sameTree(afterInit, treeHash(A.dir)));
const i3c = run('s3-init-yes-second-apply', A.dir, ['init', '--yes']);
check('S3', 'second init --yes applies nothing (tree unchanged)', i3c.code === 0 && sameTree(afterInit, treeHash(A.dir)), `exit ${i3c.code}`);
const d3 = run('s3-doctor-json-after-repair', A.dir, ['doctor', '--json']);
check('S3', 'doctor after repair has no INVALID_CONTEXTBRAKE_CONFIG', !(d3.json?.findings ?? []).some((f) => f.code === 'INVALID_CONTEXTBRAKE_CONFIG'), `exit ${d3.code}; codes=${(d3.json?.findings ?? []).map((f) => f.code).join(',')}`);
check('S3', 'doctor --json after repair validates', (d3.json ? validDoctor(d3.json) : 'no JSON') === true);

// ---- Scenario 4: exclusion
const manifestHasOpencode = () => { const m = JSON.parse(read(path.join(A.dir, '.context-brake/manifest.json'))); return m.assets.some((a) => a.path.startsWith('.opencode')) || m.entries.some((e) => e.harness === 'opencode'); };
check('S4', 'precondition: OpenCode installed (asset + manifest)', exists(path.join(A.dir, '.opencode/plugins/context-brake.js')) && manifestHasOpencode() && JSON.parse(read(path.join(A.dir, CONFIG))).activeHarnesses.includes('opencode'));
const preEx = treeHash(A.dir);
const e4d = run('s4-exclude-dry-run-json', A.dir, ['init', '--exclude-harness', 'opencode', '--dry-run', '--json']);
const e4dt = run('s4-exclude-dry-run-text', A.dir, ['init', '--exclude-harness', 'opencode', '--dry-run']);
check('S4', 'exclude --dry-run exit 0, JSON validates, writes nothing', e4d.code === 0 && (e4d.json ? validInstall(e4d.json) : 'no JSON') === true && sameTree(preEx, treeHash(A.dir)), `exit ${e4d.code}`);
const delChanges = (e4d.json?.plan?.changes ?? []).filter((c) => JSON.stringify(c).includes('opencode'));
note('S4', 'dry-run changes mentioning opencode', delChanges.map((c) => `${c.action ?? c.kind}:${c.path}`).join(' | '));
check('S4', 'preview lists OpenCode artifact deletion', delChanges.some((c) => (c.action ?? c.kind ?? '').toString().includes('delete') || JSON.stringify(c).includes('delete')) );
check('S4', 'text preview lists the OpenCode deletion', e4dt.stdout.includes('[delete] .opencode/plugins/context-brake.js'));
const e4 = run('s4-exclude-yes-json', A.dir, ['init', '--exclude-harness', 'opencode', '--yes', '--json']);
const e4t = run('s4-exclude-yes-text-second', A.dir, ['init', '--exclude-harness', 'opencode', '--yes']);
check('S4', 'init --exclude-harness opencode --yes exit 0 and JSON validates', e4.code === 0 && (e4.json ? validInstall(e4.json) : 'no JSON') === true, `exit ${e4.code}`);
const cfg4 = JSON.parse(read(path.join(A.dir, CONFIG)));
fs.writeFileSync(path.join(EVID, 's4-after-exclude-config.json'), read(path.join(A.dir, CONFIG)));
check('S4', 'OpenCode artifacts deleted', !exists(path.join(A.dir, '.opencode/plugins/context-brake.js')), exists(path.join(A.dir, '.opencode')) ? '.opencode dir remains: ' + fs.readdirSync(path.join(A.dir, '.opencode')).join(',') : '');
check('S4', 'activeHarnesses without opencode', !cfg4.activeHarnesses.includes('opencode') && cfg4.activeHarnesses.length === 3, JSON.stringify(cfg4.activeHarnesses));
check('S4', 'excludedHarnesses == ["opencode"]', JSON.stringify(cfg4.excludedHarnesses) === '["opencode"]', JSON.stringify(cfg4.excludedHarnesses));
check('S4', 'config validates (strict schema + published JSON Schema)', conf.configurationSchema.safeParse(cfg4).success && ajvConfig(cfg4));
check('S4', 'manifest without OpenCode asset/entry', !manifestHasOpencode());
check('S4', 'other harnesses untouched (hook files equal expected, runtime assets present)', ['claude', 'codex', 'cursor'].every((k) => read(A[k].file) === A[k].expectedAfterInit) && exists(path.join(A.dir, '.claude/hooks/context-brake.mjs')) && exists(path.join(A.dir, '.codex/hooks/context-brake.mjs')) && exists(path.join(A.dir, '.cursor/hooks/context-brake.mjs')));
check('S4', 'opencode.json (foreign) untouched', read(path.join(A.dir, 'opencode.json')) === A.opencodeJson);
check('S4', 'repeating the exclusion plans nothing (idempotent)', e4t.code === 0);
const afterEx = treeHash(A.dir);
const p4j = run('s4-plain-init-yes-json', A.dir, ['init', '--yes', '--json']);
const p4t = run('s4-plain-init-yes-text', A.dir, ['init', '--yes']);
const p4d = run('s4-plain-init-dry-run-json', A.dir, ['init', '--yes', '--dry-run', '--json']);
check('S4', 'plain init --yes exit 0, validates, keeps OpenCode off (tree unchanged, no reinstall)', p4j.code === 0 && (p4j.json ? validInstall(p4j.json) : 'no JSON') === true && sameTree(afterEx, treeHash(A.dir)), `exit ${p4j.code}`);
check('S4', 'plain init plans no change at all', (p4d.json?.plan?.changes ?? ['x']).length === 0 && !JSON.stringify(p4d.json?.plan?.harnesses ?? []).includes('opencode'), `changes=${p4d.json?.plan?.changes?.length}; harnesses=${(p4d.json?.plan?.harnesses ?? []).map((h) => h.harness).join(',')}`);
const detOc = p4j.json?.detections?.find((d) => d.harness === 'opencode');
check('S4', 'JSON detection state for opencode is excluded', detOc?.state === 'excluded', detOc?.state);
check('S4', 'text detection line says excluded by configuration', /opencode: excluded by configuration/.test(p4t.stdout), '');
const dd = run('s4-doctor-text', A.dir, ['doctor']);
const ddj = run('s4-doctor-json', A.dir, ['doctor', '--json']);
check('S4', 'doctor text lists opencode as excluded', /opencode: excluded by configuration/.test(dd.stdout + dd.stderr));
const ocMissing = (ddj.json?.findings ?? []).filter((f) => /opencode/i.test(JSON.stringify(f)) && /MISSING/.test(f.code));
check('S4', 'doctor does not report opencode as missing (no INTEGRATION_MISSING for it)', ocMissing.length === 0, JSON.stringify(ocMissing).slice(0, 300));
check('S4', 'doctor --json validates and detection state excluded', (ddj.json ? validDoctor(ddj.json) : 'no JSON') === true && ddj.json?.detections?.find((d) => d.harness === 'opencode')?.state === 'excluded', `exit ${ddj.code}`);
note('S4', 'doctor finding codes after exclusion', `exit ${ddj.code}; ${(ddj.json?.findings ?? []).map((f) => f.code + ':' + f.severity).join(',')}`);
const both = run('s4-both-flags-conflict', A.dir, ['init', '--harness', 'opencode', '--exclude-harness', 'opencode', '--yes']);
const bothj = run('s4-both-flags-conflict-json', A.dir, ['init', '--harness', 'opencode', '--exclude-harness', 'opencode', '--yes', '--json']);
check('S4', '--harness opencode --exclude-harness opencode exits 64 (text and JSON) and writes nothing', both.code === 64 && bothj.code === 64 && sameTree(afterEx, treeHash(A.dir)), `exit ${both.code}/${bothj.code}`);
const inc = run('s4-include-yes-json', A.dir, ['init', '--harness', 'opencode', '--yes', '--json']);
const cfg4b = JSON.parse(read(path.join(A.dir, CONFIG)));
fs.writeFileSync(path.join(EVID, 's4-after-include-config.json'), read(path.join(A.dir, CONFIG)));
check('S4', 'init --harness opencode --yes exit 0, JSON validates', inc.code === 0 && (inc.json ? validInstall(inc.json) : 'no JSON') === true, `exit ${inc.code}`);
check('S4', 'OpenCode back: asset exists, active, exclusion cleared, manifest has it', exists(path.join(A.dir, '.opencode/plugins/context-brake.js')) && cfg4b.activeHarnesses.includes('opencode') && !(cfg4b.excludedHarnesses ?? []).includes('opencode') && manifestHasOpencode(), JSON.stringify({ a: cfg4b.activeHarnesses, x: cfg4b.excludedHarnesses }));
check('S4', 'other hook files still equal expected after the whole sequence', ['claude', 'codex', 'cursor'].every((k) => read(A[k].file) === A[k].expectedAfterInit));

// ================= Scenario 5: remove on a fresh copy =================
const B = buildFixture('B');
const baseB = treeHash(B.dir);
check('S5', 'fresh fixture B still carries retired keys and owned retired entries', ownedRetired(B).length === 6 && read(path.join(B.dir, CONFIG)) === B.earlierConfigText);
const r5d = run('s5-remove-dry-run-json', B.dir, ['remove', '--dry-run', '--json']);
check('S5', 'remove --dry-run exit 0, validates, writes nothing', r5d.code === 0 && (r5d.json ? validInstall(r5d.json) : 'no JSON') === true && sameTree(baseB, treeHash(B.dir)), `exit ${r5d.code}`);
const r5 = run('s5-remove-yes-json', B.dir, ['remove', '--yes', '--json']);
check('S5', 'remove --yes --json exit 0 and validates (no INVALID_CONTEXTBRAKE_CONFIG)', r5.code === 0 && (r5.json ? validInstall(r5.json) : 'no JSON') === true && !JSON.stringify(r5.json ?? {}).includes('INVALID_CONTEXTBRAKE_CONFIG'), `exit ${r5.code}; status=${r5.json?.status}`);
check('S5', 'config and manifest deleted', !exists(path.join(B.dir, CONFIG)) && !exists(path.join(B.dir, '.context-brake/manifest.json')));
const artifacts = ['.claude/hooks/context-brake.mjs', '.claude/hooks/context-brake-statusline.mjs', '.codex/hooks/context-brake.mjs', '.cursor/hooks/context-brake.mjs', '.opencode/plugins/context-brake.js'];
check('S5', 'all runtime artifacts deleted', artifacts.every((p) => !exists(path.join(B.dir, p))), artifacts.filter((p) => exists(path.join(B.dir, p))).join(','));
check('S5', 'no ContextBrake-owned entry remains under any event in hook files', ['claude', 'codex', 'cursor'].every((k) => !read(B[k].file).includes('context-brake')), '');
check('S5', 'foreign hook entries remain verbatim', foreignKept(B).length === 0, foreignKept(B).join(' ; '));
for (const k of ['claude', 'codex', 'cursor']) {
  const got = read(B[k].file);
  const eq = got === B[k].expectedAfterRemove;
  if (eq) check('S5', `${k} hook file equals the foreign-only file byte for byte`, true);
  else note('S5', `${k} hook file differs from my canonical foreign-only rendering`, 'see evidence s5-after-' + k);
  fs.writeFileSync(path.join(EVID, `s5-after-${k}.json`), got);
}
if (symlinkOk) check('S5', 'symlink .claude -> .agents intact', fs.lstatSync(path.join(B.dir, '.claude')).isSymbolicLink() && fs.readlinkSync(path.join(B.dir, '.claude')) === '.agents');
check('S5', 'opencode.json untouched', read(path.join(B.dir, 'opencode.json')) === B.opencodeJson);
const left = Object.keys(treeHash(B.dir)).filter((p) => /context-brake|\.context-brake/.test(p));
check('S5', 'no ContextBrake path remains in the tree', left.length === 0, left.join(','));
const r5b = run('s5-remove-yes-second', B.dir, ['remove', '--yes']);
note('S5', 'second remove', `exit ${r5b.code}`);

// ================= Scenario 5b / FR-08: remove after exclusion =================
const C = buildFixture('C');
const c1 = run('s5b-exclude-yes', C.dir, ['init', '--exclude-harness', 'opencode', '--yes']);
check('S5b', 'exclusion on fixture C (retired keys also repaired) exit 0', c1.code === 0 && JSON.parse(read(path.join(C.dir, CONFIG))).excludedHarnesses?.[0] === 'opencode', `exit ${c1.code}`);
const c2 = run('s5b-remove-yes-json', C.dir, ['remove', '--yes', '--json']);
check('S5b', 'remove --yes after exclusion: exit 0, config (exclusion included) and manifest deleted, nothing of ContextBrake remains', c2.code === 0 && !exists(path.join(C.dir, CONFIG)) && !exists(path.join(C.dir, '.context-brake/manifest.json')) && Object.keys(treeHash(C.dir)).filter((p) => /context-brake/.test(p)).length === 0, `exit ${c2.code}`);

fs.writeFileSync(path.join(EVID, 'checks.json'), JSON.stringify({ meta, symlinkOk, symlinkReason, results }, null, 2));
const failed = results.filter((r) => r.ok === false);
console.log(`\nTOTAL ${results.length}  FAIL ${failed.length}`);
console.log(JSON.stringify(meta));
