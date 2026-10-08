import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check, cli, EVIDENCE, makeRepo, results, run } from './lib.mjs';

const DRIVER = join(import.meta.dirname, 'inproc-driver.mjs');
const codesOf = (out) => Object.values(out.logs ?? {}).flatMap((l) => l.records.map((r) => r.code));
async function drive(harness, scenario, extraEnv = {}) {
  const ev = `inprocess-${harness}.txt`;
  const repo = await makeRepo(`${harness}-${scenario}`, [harness]);
  await cli(repo, ['init', '--yes', '--auto-restart'], ev);
  const res = await run(repo, process.execPath, [DRIVER, repo.root, harness, scenario], { evidence: ev, extraEnv });
  try { return JSON.parse(res.stdout.trim().split('\n').pop()); } catch { return { error: res.stdout + res.stderr }; }
}
for (const harness of ['pi', 'oh-my-pi']) {
  await writeFile(join(EVIDENCE, `inprocess-${harness}.txt`), `# Built ${harness} extension files installed by init --auto-restart, driven in a child process by a fake host (FR-02, FR-04, FR-07, FR-08, FR-09, FR-12, TC-09)\n`);
  const sc = `inproc-${harness}`;
  const fresh = await drive(harness, 'fresh');
  const resume = (fresh.boots ?? []).map((b) => b.message ?? '').join('\n');
  check(sc, 'fresh handoff + marker: one restart, one seed', codesOf(fresh).join() === 'RESTARTED' && fresh.seeds?.length === 1 && fresh.seeds[0].includes('restarted automatically'), JSON.stringify(fresh).slice(0, 600));
  if (harness === 'pi') check(sc, 'restart dispatched through /context-brake-restart with no keystroke', fresh.dispatched?.[0] === '/context-brake-restart');
  else check(sc, 'editor prefilled with /context-brake-restart (one Enter, DEC-19)', fresh.dispatched?.length === 1 && fresh.seeds.length === 1);
  check(sc, 'new session start delivers the resume instruction naming the archived handoff', /\[ContextBrake resume v1\] Read "\.context-brake\/handoffs\/[^"]+\.md"/.test(resume) && fresh.archive?.length === 1, resume || JSON.stringify(fresh.boots));
  const stale = await drive(harness, 'stale');
  check(sc, 'stale handoff: SKIP_HANDOFF_STALE, no seed', codesOf(stale).join() === 'SKIP_HANDOFF_STALE' && stale.seeds.length === 0, JSON.stringify(codesOf(stale)));
  const missing = await drive(harness, 'missing');
  check(sc, 'missing handoff: SKIP_HANDOFF_MISSING, no seed', codesOf(missing).join() === 'SKIP_HANDOFF_MISSING' && missing.seeds.length === 0, JSON.stringify(codesOf(missing)));
  const env = await drive(harness, 'env', { CONTEXT_BRAKE_AUTO_RESTART: '0' });
  check(sc, 'CONTEXT_BRAKE_AUTO_RESTART=0: SKIP_DISABLED_ENV', codesOf(env).join() === 'SKIP_DISABLED_ENV' && env.seeds.length === 0, JSON.stringify(codesOf(env)));
  const print = await drive(harness, 'print');
  check(sc, 'non-interactive: SKIP_NON_INTERACTIVE', codesOf(print).join() === 'SKIP_NON_INTERACTIVE' && print.seeds.length === 0, JSON.stringify(codesOf(print)));
  const limit = await drive(harness, 'limit');
  const codes = codesOf(limit);
  check(sc, 'consecutive limit pauses, a typed prompt resets it', codes.filter((c) => c === 'RESTARTED').length === 3 && codes.includes('PAUSED_LOOP_GUARD') && codes.at(-1) === 'RESTARTED', JSON.stringify(codes));
}
await writeFile(join(EVIDENCE, 'inprocess-scenarios-results.json'), JSON.stringify(results, null, 1));
console.log(`\nTOTAL ${results.length} checks, ${results.filter((r) => !r.ok).length} failed`);
