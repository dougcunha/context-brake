import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check, cli, EVIDENCE, exists, FIX, FIXTURE_FILES, makeRepo, note, read, results, schemas, tree, write } from './lib.mjs';

const { installReportSchema, doctorReportSchema } = await schemas();
const HARNESSES = Object.keys(FIXTURE_FILES);
const EXPECTED_MODE = {
  'claude-code': 'Restart is automatic on this harness.',
  pi: 'Restart is automatic on this harness.',
  'oh-my-pi': 'Restart is semi-automatic on this harness.',
  'codex-cli': 'Restart is semi-automatic on this harness.',
  cursor: 'Restart is semi-automatic on this harness.',
  'github-copilot-cli': 'Restart is semi-automatic on this harness.',
  opencode: 'Restart is not available on this harness.',
  'antigravity-cli': 'Restart is not available on this harness.',
};
const EXPECTED_IMPACT = {
  pi: 'Automatic restart: a valid reset signal opens a new session by itself.',
  'oh-my-pi': 'Semi-automatic restart: press Enter on the prefilled /context-brake-restart; the new session resumes by itself.',
  'codex-cli': 'Semi-automatic restart: run /new; the new session resumes by itself.',
  cursor: 'Semi-automatic restart: start a new session; it resumes by itself.',
  'github-copilot-cli': 'Semi-automatic restart: start a new session; it resumes by itself.',
  opencode: 'No restart: this harness cannot inject the resume instruction.',
  'antigravity-cli': 'No restart: this harness cannot inject the resume instruction.',
};
const RESTART_FILES = { pi: '.pi/extensions/context-brake-restart.js', 'oh-my-pi': '.omp/extensions/context-brake-restart.js', 'claude-code': '.context-brake/claude-mod/context-brake-restart/hooks/register.mjs' };
const RUNNABLE = HARNESSES.filter((h) => !['opencode', 'antigravity-cli'].includes(h));

function parse(schema, text) {
  try { const r = schema.safeParse(JSON.parse(text)); return r.success ? r.data : { __error: JSON.stringify(r.error.issues).slice(0, 400) }; } catch (e) { return { __error: String(e) }; }
}
function textChecks(sc, label, result) {
  const all = result.stdout + result.stderr;
  check(sc, `${label}: NO_COLOR text has no ANSI escape`, !all.includes('\u001b['), all.slice(0, 200));
  check(sc, `${label}: text carries status labels`, /\[(OK|WARN|ERROR)\]/.test(all));
}

// TC-13: init --auto-restart per single-harness fixture, twice
for (const harness of HARNESSES) {
  const sc = `init-${harness}`;
  const ev = `init-auto-restart-${harness}.txt`;
  await writeFile(join(EVIDENCE, ev), `# init --auto-restart on a ${harness}-only fixture (TC-13, FR-07, FR-08, FR-10, DEC-11, DEC-12)\n`);
  const repo = await makeRepo(`init-${harness}`, [harness]);
  const text = await cli(repo, ['init', '--yes', '--auto-restart', '--dry-run'], ev);
  textChecks(sc, 'dry-run text', text);
  const restartable = RUNNABLE.includes(harness);
  if (!restartable) {
    check(sc, 'dry-run fails with the target error (exit 64, usage error)', text.code === 64 && text.stderr.includes('--auto-restart needs at least one active harness with a restart mode'), `exit=${text.code} ${text.stderr}`);
    const off = await cli(repo, ['init', '--yes', '--json', '--auto-restart'], ev);
    check(sc, 'applied --json fails, writes nothing', off.code === 64 && (await tree(repo.root)).every((p) => FIXTURE_FILES[harness].some(([, to]) => to === p)), `exit=${off.code}`);
    continue;
  }
  check(sc, 'dry-run exit 0', text.code === 0, `exit=${text.code} ${text.stderr}`);
  check(sc, 'dry-run lists .context-brake/.gitignore', text.stdout.includes('[create] .context-brake/.gitignore (runtime_asset)'));
  if (RESTART_FILES[harness]) check(sc, `dry-run lists ${RESTART_FILES[harness]}`, text.stdout.includes(RESTART_FILES[harness]));
  check(sc, 'dry-run writes nothing', (await tree(repo.root)).length === FIXTURE_FILES[harness].length, (await tree(repo.root)).join(','));
  const first = await cli(repo, ['init', '--yes', '--json', '--auto-restart'], ev);
  const report = parse(installReportSchema, first.stdout);
  check(sc, 'init --json exit 0 and matches the install report schema', first.code === 0 && !report.__error, `exit=${first.code} ${report.__error ?? ''} ${first.stderr}`);
  const modes = (report.findings ?? []).filter((f) => f.code === 'AUTO_RESTART_MODE');
  check(sc, 'one AUTO_RESTART_MODE finding for the harness', modes.length === 1 && modes[0].harness === harness && modes[0].message === EXPECTED_MODE[harness], JSON.stringify(modes));
  if (EXPECTED_IMPACT[harness]) check(sc, 'AUTO_RESTART_MODE impact text (DEC-10)', modes[0]?.impact === EXPECTED_IMPACT[harness], modes[0]?.impact);
  check(sc, '.context-brake/.gitignore content', (await read(join(repo.root, '.context-brake/.gitignore'))) === 'handoff.md\nhandoffs/\n');
  for (const [h, file] of Object.entries(RESTART_FILES)) {
    check(sc, `${file} ${h === harness ? 'installed' : 'absent'}`, (await exists(join(repo.root, file))) === (h === harness));
  }
  const manifest = await read(join(repo.root, '.context-brake/manifest.json'));
  check(sc, 'manifest records the ignore file', manifest?.includes('.context-brake/.gitignore') === true);
  const second = await cli(repo, ['init', '--yes', '--json', '--auto-restart'], ev);
  const report2 = parse(installReportSchema, second.stdout);
  check(sc, 'second run plans no change', second.code === 0 && Array.isArray(report2.plan?.changes) && report2.plan.changes.length === 0, JSON.stringify(report2.plan?.changes ?? report2.__error));
  await note(ev, `tree after init: ${(await tree(repo.root)).join(', ')}`);
}

// combined fixture, text output, and git ignore check (NFR-04)
{
  const sc = 'init-all';
  const ev = 'init-auto-restart-all.txt';
  await writeFile(join(EVIDENCE, ev), '# init --auto-restart on a fixture with all eight harnesses (TC-13, UX, NFR-04)\n');
  const repo = await makeRepo('init-all', HARNESSES);
  const res = await cli(repo, ['init', '--yes', '--auto-restart'], ev);
  check(sc, 'exit 0', res.code === 0, res.stderr);
  textChecks(sc, 'init text', res);
  const lines = res.stdout.split('\n').filter((l) => l.includes('AUTO_RESTART_MODE'));
  check(sc, 'eight AUTO_RESTART_MODE lines in text', lines.length === 8, String(lines.length));
  check(sc, 'each AUTO_RESTART_MODE text line names its harness (UX: "for each active harness")', lines.every((l) => HARNESSES.some((h) => l.includes(h))), lines.join(' | '));
  const json = await cli(repo, ['init', '--yes', '--json', '--auto-restart', '--dry-run'], ev);
  const report = parse(installReportSchema, json.stdout);
  const modes = Object.fromEntries((report.findings ?? []).filter((f) => f.code === 'AUTO_RESTART_MODE').map((f) => [f.harness, f.message]));
  check(sc, 'JSON AUTO_RESTART_MODE per harness matches DEC-10 destinations', HARNESSES.every((h) => modes[h] === EXPECTED_MODE[h]), JSON.stringify(modes));
  const summary = (report.plan?.changes ?? []).find((c) => c.owner === 'config')?.preview?.summary ?? res.stdout.split('\n').find((l) => l.includes('Configure ContextBrake')) ?? '';
  await note(ev, `config preview summary: ${summary}`);
  await write(join(repo.root, '.context-brake/handoff.md'), '# Goal\n');
  await write(join(repo.root, '.context-brake/handoffs/20260101T000000.000Z.md'), '# Old\n');
  const { run } = await import('./lib.mjs');
  const ignored = await run(repo, 'git', ['status', '--porcelain', '--ignored', '--', '.context-brake'], { evidence: ev });
  check(sc, 'git ignores handoff.md and handoffs/ (NFR-04)', ignored.stdout.includes('!! .context-brake/handoff.md') && ignored.stdout.includes('!! .context-brake/handoffs/'), ignored.stdout);
}

// restart off: no restart artifact (NFR-05)
{
  const sc = 'init-off';
  const ev = 'init-restart-off.txt';
  await writeFile(join(EVIDENCE, ev), '# init without --auto-restart on all harnesses (NFR-05)\n');
  const repo = await makeRepo('init-off', HARNESSES);
  const res = await cli(repo, ['init', '--yes', '--json'], ev);
  const report = parse(installReportSchema, res.stdout);
  check(sc, 'exit 0, schema valid', res.code === 0 && !report.__error, report.__error);
  const files = await tree(repo.root);
  check(sc, 'no restart file, ignore file, or Claude mod', !files.some((f) => f.includes('context-brake-restart') || f === '.context-brake/.gitignore' || f.includes('claude-mod')), files.join(','));
  check(sc, 'no AUTO_RESTART_MODE finding', !(report.findings ?? []).some((f) => f.code === 'AUTO_RESTART_MODE'));
  const config = JSON.parse(await readFile(join(repo.root, 'context-brake.config.json'), 'utf8'));
  check(sc, 'config has no autoRestart', config.autoRestart === undefined);
}

// pi + codex without Claude Code (TC-13)
{
  const sc = 'init-pi-codex';
  const ev = 'init-auto-restart-pi-codex.txt';
  await writeFile(join(EVIDENCE, ev), '# init --auto-restart without claude-code (TC-13)\n');
  const repo = await makeRepo('init-pi-codex', ['pi', 'codex-cli']);
  const res = await cli(repo, ['init', '--yes', '--json', '--auto-restart'], ev);
  check(sc, 'succeeds without claude-code', res.code === 0, res.stderr);
  check(sc, 'no Claude mod installed', !(await tree(repo.root)).some((f) => f.includes('claude-mod')));
}

// doctor per harness (TC-12, FR-10, FR-11)
const LOG_DIR = { pi: 'pi', 'oh-my-pi': 'oh-my-pi', 'claude-code': 'claude-code' };
for (const harness of RUNNABLE) {
  const sc = `doctor-${harness}`;
  const ev = `doctor-${harness}.txt`;
  await writeFile(join(EVIDENCE, ev), `# doctor on a ${harness}-only fixture with restart on (TC-12, FR-10, FR-11)\n`);
  const repo = await makeRepo(`doctor-${harness}`, [harness]);
  await cli(repo, ['init', '--yes', '--auto-restart'], ev);
  const text = await cli(repo, ['doctor'], ev);
  textChecks(sc, 'doctor text', text);
  const res = await cli(repo, ['doctor', '--json'], ev);
  const report = parse(doctorReportSchema, res.stdout);
  check(sc, 'doctor --json matches the doctor report schema', !report.__error, report.__error);
  check(sc, 'exit code equals report.exitCode', res.code === report.exitCode, `${res.code} vs ${report.exitCode}`);
  const integ = (report.integrations ?? []).find((i) => i.harness === harness);
  const cap = (integ?.support?.limitations ?? []).find((l) => l.capability === 'auto_restart');
  if (EXPECTED_IMPACT[harness] && harness !== 'pi') check(sc, 'integration shows the declared auto_restart impact', cap?.impact === EXPECTED_IMPACT[harness], JSON.stringify(cap));
  const restart = (report.findings ?? []).filter((f) => f.code.startsWith('AUTO_RESTART'));
  await note(ev, `AUTO_RESTART findings: ${JSON.stringify(restart.map((f) => [f.code, f.harness, f.message, f.impact]))}`);
  const handoffFinding = restart.find((f) => f.code === 'AUTO_RESTART_HANDOFF');
  check(sc, 'AUTO_RESTART_HANDOFF states markdown handoff, none pending', handoffFinding?.message?.includes('markdown handoff') && handoffFinding.message.includes('No handoff is pending'), handoffFinding?.message);
  if (LOG_DIR[harness]) {
    check(sc, 'NOT_LOADED before any session', restart.some((f) => f.code === 'AUTO_RESTART_NOT_LOADED' && f.harness === harness));
    const dir = join(repo.root, '.context-brake/runtime/restart', LOG_DIR[harness]);
    const log = (version, code) => JSON.stringify({ v: 2, harness, componentVersion: version, harnessVersion: 'unknown', records: code ? [{ at: new Date().toISOString(), code }] : [] });
    await write(join(dir, 'qa-session.json'), log('1.0.0', 'SKIP_HANDOFF_STALE'));
    const ready = parse(doctorReportSchema, (await cli(repo, ['doctor', '--json'], ev)).stdout);
    const codes = (ready.findings ?? []).filter((f) => f.harness === harness && f.code.startsWith('AUTO_RESTART')).map((f) => f.code);
    check(sc, 'READY and LAST_SKIP from a current v2 log', codes.includes('AUTO_RESTART_READY') && codes.includes('AUTO_RESTART_LAST_SKIP'), JSON.stringify(codes) + (ready.__error ?? ''));
    const skip = (ready.findings ?? []).find((f) => f.code === 'AUTO_RESTART_LAST_SKIP');
    await note(ev, `LAST_SKIP finding: ${JSON.stringify(skip)}`);
    if (harness === 'pi') {
      const readyFinding = (ready.findings ?? []).find((f) => f.code === 'AUTO_RESTART_READY' && f.harness === 'pi');
      check(sc, 'Pi READY carries the automatic restart impact (DEC-10)', readyFinding?.impact === EXPECTED_IMPACT.pi || readyFinding?.message?.includes('utomatic'), JSON.stringify(readyFinding));
    }
    await write(join(dir, 'qa-session.json'), log('0.0.1', null));
    const outdated = parse(doctorReportSchema, (await cli(repo, ['doctor', '--json'], ev)).stdout);
    check(sc, 'OUTDATED_MOD from an older component version', (outdated.findings ?? []).some((f) => f.harness === harness && f.code === 'AUTO_RESTART_OUTDATED_MOD'), JSON.stringify((outdated.findings ?? []).filter((f) => f.code.startsWith('AUTO_RESTART')).map((f) => f.code)));
    await write(join(dir, 'qa-session.json'), JSON.stringify({ v: 1, claudeVersion: '2.1.300', modVersion: '1.0.0', records: [] }));
    const v1 = await cli(repo, ['doctor', '--json'], ev);
    const v1r = parse(doctorReportSchema, v1.stdout);
    check(sc, 'v1 log ignored: NOT_LOADED, no crash', !v1r.__error && (v1r.findings ?? []).some((f) => f.harness === harness && f.code === 'AUTO_RESTART_NOT_LOADED'), JSON.stringify((v1r.findings ?? []).filter((f) => f.code.startsWith('AUTO_RESTART')).map((f) => f.code)) + v1.stderr);
  } else {
    check(sc, 'semi-automatic READY with harness', restart.some((f) => f.code === 'AUTO_RESTART_READY' && f.harness === harness && f.message.includes('Semi-automatic')), JSON.stringify(restart));
  }
  await write(join(repo.root, '.context-brake/handoff.md'), '# Goal\n');
  const pending = parse(doctorReportSchema, (await cli(repo, ['doctor', '--json'], ev)).stdout);
  const pf = (pending.findings ?? []).find((f) => f.code === 'AUTO_RESTART_HANDOFF');
  check(sc, 'AUTO_RESTART_HANDOFF reports a pending handoff', pf !== undefined && !pf.message.includes('No handoff is pending') && /pending/i.test(pf.message), pf?.message);
  const snap = await cli(repo, ['init', '--yes', '--snapshot-command', '/sdd-snapshot'], ev);
  const snapDoctor = parse(doctorReportSchema, (await cli(repo, ['doctor', '--json'], ev)).stdout);
  const sf = (snapDoctor.findings ?? []).find((f) => f.code === 'AUTO_RESTART_HANDOFF');
  check(sc, 'AUTO_RESTART_HANDOFF names the snapshot skill mode', snap.code === 0 && sf?.message?.toLowerCase().includes('snapshot'), sf?.message);
}

// doctor with restart off: no restart findings
{
  const sc = 'doctor-off';
  const ev = 'doctor-restart-off.txt';
  await writeFile(join(EVIDENCE, ev), '# doctor with restart off (FR-11 "per harness that has restart on", NFR-05)\n');
  const repo = await makeRepo('doctor-off', ['pi', 'codex-cli']);
  await cli(repo, ['init', '--yes'], ev);
  const report = parse(doctorReportSchema, (await cli(repo, ['doctor', '--json'], ev)).stdout);
  const codes = (report.findings ?? []).filter((f) => f.code.startsWith('AUTO_RESTART')).map((f) => f.code);
  check(sc, 'no AUTO_RESTART_* findings with restart off', codes.length === 0, JSON.stringify(codes));
}

// remove and --no-auto-restart keep handoffs and foreign content (TC-14, FR-13)
for (const command of [['remove', '--yes'], ['init', '--yes', '--no-auto-restart']]) {
  for (const harness of RUNNABLE) {
    const sc = `${command[0] === 'remove' ? 'remove' : 'no-auto-restart'}-${harness}`;
    const ev = `${command[0] === 'remove' ? 'remove' : 'no-auto-restart'}-${harness}.txt`;
    await writeFile(join(EVIDENCE, ev), `# ${command.join(' ')} on a ${harness} fixture with a pending handoff and an archive (TC-14, FR-13, DEC-14)\n`);
    const repo = await makeRepo(sc, [harness]);
    const originals = {};
    for (const [, to] of FIXTURE_FILES[harness]) originals[to] = await readFile(join(repo.root, to));
    await cli(repo, ['init', '--yes', '--auto-restart'], ev);
    await write(join(repo.root, '.context-brake/handoff.md'), '# Pending\n');
    for (let i = 0; i < 10; i += 1) await write(join(repo.root, `.context-brake/handoffs/20260101T0000${String(i).padStart(2, '0')}.000Z.md`), `# Archived ${i}\n`);
    await write(join(repo.root, '.context-brake/runtime/restart', harness, 'qa.json'), '{}');
    const before = await tree(repo.root);
    const dry = await cli(repo, [...command, '--dry-run'], ev);
    check(sc, 'dry run names the kept handoffs', (dry.stdout + dry.stderr).includes('.context-brake/handoff.md') && (dry.stdout + dry.stderr).includes('.context-brake/handoffs/'), dry.stdout.slice(-400));
    check(sc, 'dry run changes nothing', JSON.stringify(await tree(repo.root)) === JSON.stringify(before));
    const res = await cli(repo, command, ev);
    textChecks(sc, 'text', res);
    check(sc, 'exit 0', res.code === 0, res.stderr);
    check(sc, 'output names the kept handoffs (AUTO_RESTART_HANDOFF_KEPT)', res.stdout.includes('AUTO_RESTART_HANDOFF_KEPT') && res.stdout.includes('.context-brake/handoff.md') && res.stdout.includes('.context-brake/handoffs/'), res.stdout.slice(-400));
    const after = await tree(repo.root);
    check(sc, 'no restart artifact remains', !after.some((f) => f.includes('context-brake-restart') || f === '.context-brake/.gitignore' || f.includes('runtime/restart/') || f.includes('claude-mod/')), after.join(','));
    check(sc, 'pending handoff kept byte-identical', (await read(join(repo.root, '.context-brake/handoff.md'))) === '# Pending\n');
    check(sc, 'archive kept (10 files)', after.filter((f) => f.startsWith('.context-brake/handoffs/')).length === 10);
    if (command[0] === 'remove') {
      for (const [to, bytes] of Object.entries(originals)) {
        const now = await readFile(join(repo.root, to)).catch(() => null);
        check(sc, `${to} byte-identical to the fixture after remove`, now !== null && Buffer.compare(now, bytes) === 0, now === null ? 'missing' : now.toString('utf8').slice(0, 300));
      }
    } else {
      const config = JSON.parse(await readFile(join(repo.root, 'context-brake.config.json'), 'utf8'));
      check(sc, 'config autoRestart removed', config.autoRestart === undefined);
      check(sc, 'telemetry integration kept', after.some((f) => f.includes('hooks/context-brake.mjs') || f.endsWith('extensions/context-brake.js')), after.join(','));
    }
    await note(ev, `tree after: ${after.join(', ')}`);
  }
}

await writeFile(join(EVIDENCE, 'cli-scenarios-results.json'), JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.ok);
console.log(`\nTOTAL ${results.length} checks, ${failed.length} failed`);
