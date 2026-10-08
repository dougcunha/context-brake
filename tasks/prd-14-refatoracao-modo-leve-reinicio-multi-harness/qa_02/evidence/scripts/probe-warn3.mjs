// qa_01/BUG-02 reproduction, re-run for qa_02 (T22): init --no-auto-restart after a restart log exists, with and without other runtime state.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { check, cli, EVIDENCE, exists, makeRepo, note, results, write } from './lib.mjs';
const ev = 'no-auto-restart-warning.txt';
await writeFile(join(EVIDENCE, ev), '# qa_01/BUG-02 re-run: init --no-auto-restart after a restart log exists (FR-13, DEC-14, cli-output.md exit codes)\n');
const cases = [
  ['claude-code', null],
  ['pi', '.context-brake/runtime/sessions/pi/pi-s1.jsonl'],
  ['codex-cli', '.context-brake/runtime/sessions/codex-cli/codex-sess-1.jsonl'],
  ['oh-my-pi', '.context-brake/runtime/sessions/oh-my-pi/omp-s1.jsonl'],
  ['pi', null],
];
for (const [harness, extra] of cases) {
  const sc = `warn3-${harness}-${extra ? 'ledger' : 'plain'}`;
  const repo = await makeRepo(sc, [harness]);
  await note(ev, `fixture ${harness}; restart log present; other runtime entry: ${extra ?? 'none (claude-code keeps its own runtime state)'}`);
  await cli(repo, ['init', '--yes', '--auto-restart'], ev);
  await write(join(repo.root, '.context-brake/runtime/restart', harness, 's1.json'), '{}');
  if (extra) await write(join(repo.root, extra), '');
  const r = await cli(repo, ['init', '--yes', '--json', '--no-auto-restart'], ev);
  const j = JSON.parse(r.stdout);
  const skipped = j.outcomes.filter((o) => o.status === 'skipped');
  check(sc, 'exit 0 and status success', r.code === 0 && j.status === 'success', `exit=${r.code} status=${j.status}`);
  check(sc, 'no skipped outcome (no "Directory is not empty" for .context-brake/runtime)', skipped.length === 0, JSON.stringify(skipped));
  check(sc, 'runtime/restart/ gone', !(await exists(join(repo.root, '.context-brake/runtime/restart'))));
  if (extra) check(sc, 'other runtime entry kept', await exists(join(repo.root, extra)));
}
// text form of the same reproduction: no [WARN] header
{
  const sc = 'warn3-text-pi';
  const repo = await makeRepo(sc, ['pi']);
  await note(ev, 'text form: pi with a restart log and a session ledger');
  await cli(repo, ['init', '--yes', '--auto-restart'], ev);
  await write(join(repo.root, '.context-brake/runtime/restart/pi/s1.json'), '{}');
  await write(join(repo.root, '.context-brake/runtime/sessions/pi/pi-s1.jsonl'), '');
  const r = await cli(repo, ['init', '--yes', '--no-auto-restart'], ev);
  check(sc, 'text exit 0, header [OK], no [WARN]', r.code === 0 && /\[OK\] ContextBrake init/.test(r.stdout) && !r.stdout.includes('[WARN]'), r.stdout.slice(0, 400));
}
await writeFile(join(EVIDENCE, 'no-auto-restart-warning-results.json'), JSON.stringify(results, null, 1));
console.log(`TOTAL ${results.length}, failed ${results.filter((x) => !x.ok).length}`);
