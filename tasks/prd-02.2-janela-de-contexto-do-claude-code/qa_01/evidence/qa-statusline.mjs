// QA for PRD 2.2: runs the built CLI, hook, and bridge against temporary repositories.
// Usage: node qa-statusline.mjs <repoRoot> <evidenceDir>
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, unlinkSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [repo, evidence] = process.argv.slice(2);
const CLI = join(repo, 'dist/src/cli/main.js');
const PAYLOAD = JSON.parse(readFileSync(join(repo, 'tests/fixtures/harnesses/claude-code/statusline.json'), 'utf8'));
const SH = ['C:/Program Files/Git/usr/bin/sh.exe', 'C:/Program Files/Git/bin/sh.exe', 'sh'].find((c) => spawnSync(c, ['-c', 'exit 0']).status === 0);
mkdirSync(evidence, { recursive: true });
const results = [];
const base = realpathSync(mkdtempSync(join(tmpdir(), 'cb-qa-')));
const fwd = (p) => p.replace(/\\/g, '/');

function check(id, name, ok, detail) {
  results.push({ id, name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name}${ok ? '' : ' :: ' + JSON.stringify(detail).slice(0, 400)}`);
}
function log(file, data) { appendFileSync(join(evidence, file), (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) + '\n'); }
function cli(args, cwd, home, file) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, NO_COLOR: '1' } });
  log(file, { cwd: fwd(cwd), command: `context-brake ${args.join(' ')}`, exit: r.status, stdout: r.stdout, stderr: r.stderr });
  return r;
}
function shell(command, stdin) {
  const r = spawnSync(SH, ['-c', command], { input: stdin });
  return { code: r.status, stdout: r.stdout };
}
function hook(root, event, payload, file) {
  const r = spawnSync(process.execPath, [join(root, '.claude/hooks/context-brake.mjs'), event], { cwd: root, input: JSON.stringify(payload), encoding: 'utf8' });
  log(file, { event, exit: r.status, stdout: r.stdout, stderr: r.stderr });
  return r;
}
const read = (p) => readFileSync(p, 'utf8');
const localOf = (root) => join(root, '.claude/settings.local.json');
function repoWith(name, { project, local, userStatus }) {
  const root = join(base, name);
  const home = join(base, `${name}-home`);
  mkdirSync(join(root, '.claude'), { recursive: true });
  mkdirSync(join(home, '.claude'), { recursive: true });
  spawnSync('git', ['init', '-q', root]);
  writeFileSync(join(root, '.claude/settings.json'), project ?? '{\n  "hooks": {}\n}\n');
  if (local !== undefined) writeFileSync(localOf(root), local);
  if (userStatus !== undefined) writeFileSync(join(home, '.claude/settings.json'), JSON.stringify({ statusLine: userStatus }, null, 2));
  return { root, home };
}
const statuslineInput = (session, window, tokens) => JSON.stringify({
  ...PAYLOAD, session_id: session,
  context_window: { ...PAYLOAD.context_window, context_window_size: window, total_input_tokens: tokens ?? 0, current_usage: tokens === null ? null : PAYLOAD.context_window.current_usage },
});
const blockOf = (r) => (r.stdout.match(/\[ContextBrake[^\]]*\][^"\\]*/) ?? [''])[0];

// Scenario A: user-scope previous command, JSONC local file, root with spaces and accents.
const userScript = join(base, 'user-statusline.sh');
writeFileSync(userScript, `cat >/dev/null\nprintf '\\033[31mctx\\033[0m "q" \\x27s\\nline2\\n'\nexit 0\n`);
const userCommand = `sh "${fwd(userScript)}"`;
const localBefore = '{\n  // developer notes\n  "permissions": { "allow": ["Bash(ls)"] },\n  "env": { "A": "1" }\n}\n';
const A = repoWith('QA Root/ação', { local: localBefore, userStatus: { type: 'command', command: userCommand, padding: 2, refreshInterval: 5 } });

let r = cli(['init', '--yes', '--json'], A.root, A.home, 'A-01-init-no-flag.json');
check('FR-01', 'init without the flag leaves statusLine untouched', r.status === 0 && read(localOf(A.root)) === localBefore, r.status);
r = cli(['init', '--dry-run', '--json', '--statusline-bridge'], A.root, A.home, 'A-02-init-dry-run.json');
check('FR-01', '--dry-run lists settings.local.json and the state file without writing', r.status === 0 && r.stdout.includes('.claude/settings.local.json') && r.stdout.includes('claude-statusline.json') && read(localOf(A.root)) === localBefore && !existsSync(join(A.root, '.context-brake/runtime/claude-statusline.json')), r.status);
r = cli(['init', '--yes', '--json', '--statusline-bridge'], A.root, A.home, 'A-03-init-bridge.json');
const installed = read(localOf(A.root));
log('A-03-local-after-install.txt', installed);
const status = JSON.parse(installed.replace(/^\s*\/\/.*$/m, '')).statusLine;
check('FR-01', 'init --statusline-bridge writes an absolute forward-slash bridge command', r.status === 0 && status.command === `node "${fwd(A.root)}/.claude/hooks/context-brake-statusline.mjs" --pipe | ( ${userCommand}\n)`, status);
check('FR-02', 'padding and refreshInterval copied from the previous status line', status.padding === 2 && status.refreshInterval === 5, status);
check('FR-01', 'other keys and comments in settings.local.json kept', installed.includes('// developer notes') && installed.includes('"Bash(ls)"') && installed.includes('"A": "1"'), null);
check('FR-01', 'versioned .claude/settings.json has no statusLine', !read(join(A.root, '.claude/settings.json')).includes('statusLine'), null);
r = cli(['init', '--yes', '--json', '--statusline-bridge'], A.root, A.home, 'A-04-init-bridge-again.json');
const again = read(localOf(A.root));
r = cli(['init', '--yes', '--json'], A.root, A.home, 'A-05-init-flagless.json');
check('FR-01', 'second flagged init and a flagless init change nothing', again === installed && read(localOf(A.root)) === installed, null);

const SESSION = 'qa-session-1';
const alone = shell(userCommand, statuslineInput(SESSION, 200000, 15500));
const bridged = shell(status.command, statuslineInput(SESSION, 200000, 15500));
log('A-06-statusline-output.txt', { alone: alone.stdout.toString('base64'), bridged: bridged.stdout.toString('base64'), aloneCode: alone.code, bridgedCode: bridged.code });
check('FR-02/OBJ-02', 'installed command through sh -c prints the user output byte for byte (ANSI, quotes, two lines)', alone.stdout.length > 0 && alone.stdout.equals(bridged.stdout) && alone.code === bridged.code, { alone: alone.stdout.toString(), bridged: bridged.stdout.toString() });

const ledgerDir = join(A.root, '.context-brake/runtime/sessions/claude-code');
const ledgerLines = () => readdirSync(ledgerDir).flatMap((f) => read(join(ledgerDir, f)).trim().split('\n')).map((l) => JSON.parse(l));
const sl = ledgerLines().filter((l) => l.type === 'statusline');
log('A-07-ledger.json', ledgerLines());
check('FR-03/NFR-03', 'one statusline line with only the five values and the time', sl.length === 1 && JSON.stringify(Object.keys(sl[0]).sort()) === JSON.stringify(['at', 'inputTokens', 'model', 'type', 'usedPercentage', 'v', 'windowTokens']) && sl[0].windowTokens === 200000 && sl[0].inputTokens === 15500 && sl[0].model === 'claude-opus-5-5', sl);
check('NFR-03', 'ledger holds no cost, path, or output', !JSON.stringify(ledgerLines()).match(/total_cost|project_dir|ctx|line2/), null);

// Hook flow: FR-04, FR-05, FR-06 on the installed hook.
const tool = (id) => ({ session_id: SESSION, transcript_path: join(base, 'missing-transcript.jsonl'), cwd: A.root, hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'ls' }, tool_response: { stdout: 'ok', stderr: '' }, tool_use_id: `toolu_${id}` });
const lastTool = () => ledgerLines().filter((l) => l.type === 'tool').at(-1);
r = hook(A.root, 'PostToolUse', tool(1), 'A-08-hooks.json');
let t = lastTool(); log('A-08-tool-lines.json', t);
check('FR-05/FR-04', 'no transcript: bridge tokens measured over the bridge window', t.source === 'measured' && t.usedTokens === 15500 && t.windowTokens === 200000, t);
shell(status.command, statuslineInput(SESSION, 1000000, 200000));
r = hook(A.root, 'PostToolUse', tool(2), 'A-08-hooks.json');
t = lastTool(); log('A-08-tool-lines.json', t);
check('FR-04/US-03', 'window follows the latest status line run (model change to 1M)', t.source === 'measured' && t.usedTokens === 200000 && t.windowTokens === 1000000, t);
r = hook(A.root, 'SessionStart', { session_id: SESSION, cwd: A.root, hook_event_name: 'SessionStart', source: 'compact' }, 'A-08-hooks.json');
shell(status.command, statuslineInput(SESSION, 1000000, null));
r = hook(A.root, 'PostToolUse', tool(3), 'A-08-hooks.json');
t = lastTool(); log('A-08-tool-lines.json', t);
check('FR-06/OBJ-01', 'after /compact the estimated reading keeps the recorded 1M window', t.source === 'estimated' && t.windowTokens === 1000000, t);
shell(status.command, statuslineInput(SESSION, 1000000, 30000));
r = hook(A.root, 'PostToolUse', tool(4), 'A-08-hooks.json');
t = lastTool(); log('A-08-tool-lines.json', t);
check('FR-05/FR-06', 'first post-reset status line reading is measured again', t.source === 'measured' && t.usedTokens === 30000 && t.windowTokens === 1000000, t);
shell(status.command, statuslineInput(SESSION, 1000000, 600000));
r = hook(A.root, 'PostToolUse', tool(5), 'A-08-hooks.json');
check('US-01/FR-04', 'YELLOW block renders usage=60% and tokens=600000/1000000', blockOf(r).includes('usage=60%') && blockOf(r).includes('tokens=600000/1000000') && blockOf(r).includes('zone=YELLOW'), blockOf(r) || r.stdout);
shell(status.command, statuslineInput(SESSION, 1000000, 660000));
r = hook(A.root, 'PostToolUse', tool(6), 'A-08-hooks.json');
check('US-01', 'RED above 650,000 tokens of a 1M window (660,000 = 66%)', blockOf(r).includes('zone=RED'), blockOf(r) || r.stdout);

// Doctor: FR-07.
r = cli(['doctor', '--json', '--harness', 'claude-code'], A.root, A.home, 'A-09-doctor.json');
let doc = JSON.parse(r.stdout);
check('FR-07/NFR-04', 'doctor --json reports installed bridge, statusline source, last window, schemaVersion 1', doc.schemaVersion === 1 && JSON.stringify(doc.contextWindow) === JSON.stringify({ bridge: 'installed', source: 'statusline', lastWindowTokens: 1000000 }), doc.contextWindow);
const codes = (d) => (d.findings ?? []).map((f) => f.code).filter((c) => c.startsWith('STATUSLINE'));
const ignored = spawnSync('git', ['-C', A.root, 'check-ignore', '-q', '.claude/settings.local.json']).status === 0;
check('FR-07', `STATUSLINE_LOCAL_TRACKED matches git check-ignore (ignored=${ignored})`, codes(doc).includes('STATUSLINE_LOCAL_TRACKED') === !ignored, codes(doc));
r = cli(['doctor', '--harness', 'claude-code'], A.root, A.home, 'A-10-doctor-text.json');
check('FR-07/UX', 'doctor text has one context window line, no ANSI with NO_COLOR', r.stdout.split('\n').filter((l) => l.trimStart().startsWith('- context window:')).length === 1 && !r.stdout.includes('\u001b['), r.stdout.split('\n').filter((l) => /window/i.test(l)));
if (!ignored) {
  appendFileSync(join(A.root, '.gitignore'), '\n.claude/settings.local.json\n');
  doc = JSON.parse(cli(['doctor', '--json', '--harness', 'claude-code'], A.root, A.home, 'A-11-doctor-ignored.json').stdout);
  check('FR-07', 'warning clears once the local file is ignored', !codes(doc).includes('STATUSLINE_LOCAL_TRACKED'), codes(doc));
}
const userSettings = join(A.home, '.claude/settings.json');
const userBefore = read(userSettings);
writeFileSync(userSettings, JSON.stringify({ statusLine: { type: 'command', command: 'echo changed' } }));
doc = JSON.parse(cli(['doctor', '--json', '--harness', 'claude-code'], A.root, A.home, 'A-12-doctor-previous-changed.json').stdout);
check('FR-07', 'STATUSLINE_PREVIOUS_CHANGED when the user status line changed', codes(doc).includes('STATUSLINE_PREVIOUS_CHANGED'), codes(doc));
writeFileSync(userSettings, userBefore);
const bridgeScript = join(A.root, '.claude/hooks/context-brake-statusline.mjs');
const scriptBytes = readFileSync(bridgeScript);
unlinkSync(bridgeScript);
doc = JSON.parse(cli(['doctor', '--json', '--harness', 'claude-code'], A.root, A.home, 'A-13-doctor-missing-script.json').stdout);
check('FR-07', 'STATUSLINE_BRIDGE_MISSING_SCRIPT when the script is gone', codes(doc).includes('STATUSLINE_BRIDGE_MISSING_SCRIPT'), codes(doc));
writeFileSync(bridgeScript, scriptBytes);
writeFileSync(localOf(A.root), installed.replace('--pipe', '--pipe --x'));
doc = JSON.parse(cli(['doctor', '--json', '--harness', 'claude-code'], A.root, A.home, 'A-14-doctor-inactive.json').stdout);
check('FR-07', 'STATUSLINE_BRIDGE_INACTIVE and bridge=inactive when the local command changed', codes(doc).includes('STATUSLINE_BRIDGE_INACTIVE') && doc.contextWindow.bridge === 'inactive', { codes: codes(doc), cw: doc.contextWindow });
writeFileSync(localOf(A.root), installed);
check('FR-07', 'every warning has a remediation', (doc.findings ?? []).filter((f) => f.code.startsWith('STATUSLINE')).every((f) => typeof f.remediation === 'string' && f.remediation.length > 0), null);

r = cli(['init', '--yes', '--json', '--no-statusline-bridge'], A.root, A.home, 'A-15-no-bridge.json');
check('FR-08/US-05', '--no-statusline-bridge restores settings.local.json byte for byte and deletes the state', r.status === 0 && read(localOf(A.root)) === localBefore && !existsSync(join(A.root, '.context-brake/runtime/claude-statusline.json')), read(localOf(A.root)));

// Scenario B: project-scope previous command; bridge creates the local file; remove deletes it.
const B = repoWith('qa-project', { project: '{\n  "statusLine": { "type": "command", "command": "printf \'proj %s\' \\"$(cat | wc -c | tr -d \' \')\\" ; exit 3" }\n}\n' });
r = cli(['init', '--yes', '--json', '--statusline-bridge'], B.root, B.home, 'B-01-init.json');
const bStatus = JSON.parse(read(localOf(B.root))).statusLine;
const bPrev = JSON.parse(read(join(B.root, '.claude/settings.json'))).statusLine.command;
const bAlone = shell(bPrev, statuslineInput('qa-b', 200000, 1000));
const bBridged = shell(bStatus.command, statuslineInput('qa-b', 200000, 1000));
log('B-02-output.json', { alone: bAlone.stdout.toString(), bridged: bBridged.stdout.toString(), codes: [bAlone.code, bBridged.code] });
check('FR-02', 'project-scope command wrapped; same stdin, output, and exit code 3', r.status === 0 && bStatus.command.includes(bPrev) && bAlone.stdout.equals(bBridged.stdout) && bBridged.code === 3, { a: bAlone, b: bBridged });
r = cli(['remove', '--yes', '--json'], B.root, B.home, 'B-03-remove.json');
check('FR-08', 'remove deletes the local file the bridge created and the state', r.status === 0 && !existsSync(localOf(B.root)) && !existsSync(join(B.root, '.context-brake/runtime/claude-statusline.json')), r.status);

// Scenario C: local scope wins over project; comment-terminated command.
const C = repoWith('qa-local', { project: '{ "statusLine": { "type": "command", "command": "echo project" } }\n', local: '{ "statusLine": { "type": "command", "command": "echo local # trailing note" } }\n' });
const cBefore = read(localOf(C.root));
r = cli(['init', '--yes', '--json', '--statusline-bridge'], C.root, C.home, 'C-01-init.json');
const cOut = shell(JSON.parse(read(localOf(C.root))).statusLine.command, statuslineInput('qa-c', 200000, 1000));
check('FR-02', 'local scope wins and a trailing # comment keeps working', r.status === 0 && cOut.stdout.toString() === 'local\n' && cOut.code === 0, cOut.stdout.toString());
r = cli(['init', '--yes', '--json', '--no-statusline-bridge'], C.root, C.home, 'C-02-no-bridge.json');
const cAfter = read(localOf(C.root));
check('FR-08', 'previous local statusLine value restored, no other key changed', JSON.stringify(JSON.parse(cAfter)) === JSON.stringify(JSON.parse(cBefore)), cAfter);
log('C-03-restore-bytes.json', { before: cBefore, after: cAfter, byteEqual: cAfter === cBefore });

// Scenario D: no previous command.
const D = repoWith('qa-none', {});
r = cli(['init', '--yes', '--json', '--statusline-bridge'], D.root, D.home, 'D-01-init.json');
const dCommand = JSON.parse(read(localOf(D.root))).statusLine.command;
const dOut = shell(dCommand, statuslineInput('qa-d', 200000, 1000));
check('FR-02', 'without a previous command: no --pipe, empty output, exit 0', !dCommand.includes('--pipe') && dOut.stdout.length === 0 && dOut.code === 0, { dCommand, out: dOut.stdout.toString() });

// Scenario E: resilience with invalid stdin (NFR-02) on scenario C reinstalled.
cli(['init', '--yes', '--json', '--statusline-bridge'], C.root, C.home, 'E-01-init.json');
const eOut = shell(JSON.parse(read(localOf(C.root))).statusLine.command, '{not json');
check('NFR-02', 'invalid stdin keeps the user output and exit code', eOut.stdout.toString() === 'local\n' && eOut.code === 0, eOut.stdout.toString());

// Scenario F: argument errors (FR-01, DEC-08, codereview_01/CR-06).
const F = join(base, 'qa-no-claude');
mkdirSync(F, { recursive: true });
r = cli(['init', '--yes', '--json', '--statusline-bridge'], F, join(base, 'qa-no-claude-home'), 'F-01-no-claude.json');
check('FR-01/DEC-08', 'no Claude Code detected: exit 64 and nothing written', r.status === 64 && readdirSync(F).length === 0, { code: r.status, files: readdirSync(F) });
r = cli(['init', '--yes', '--statusline-bridge', '--no-statusline-bridge'], D.root, D.home, 'F-02-both-flags.json');
check('DEC-08', 'both flags: exit 64', r.status === 64, r.status);

// Scenario G: unsupported root character (DEC-02, TC-11).
const G = repoWith('qa-$dollar', {});
const gBefore = existsSync(localOf(G.root));
r = cli(['init', '--yes', '--json', '--statusline-bridge'], G.root, G.home, 'G-01-dollar-root.json');
check('FR-01/DEC-02', 'root with $ gets STATUSLINE_UNSUPPORTED_PATH and no local write', r.stdout.includes('STATUSLINE_UNSUPPORTED_PATH') && existsSync(localOf(G.root)) === gBefore, { code: r.status });

writeFileSync(join(evidence, 'results.json'), JSON.stringify({ node: process.version, platform: `${process.platform} ${process.arch}`, shell: SH, base: fwd(base), results }, null, 2));
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
process.exit(failed === 0 ? 0 : 1);
