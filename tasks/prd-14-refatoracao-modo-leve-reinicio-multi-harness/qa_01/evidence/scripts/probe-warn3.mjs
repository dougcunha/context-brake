import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cli, EVIDENCE, makeRepo, write, note } from './lib.mjs';
const ev = 'no-auto-restart-warning.txt';
await writeFile(join(EVIDENCE, ev), '# BUG-02 reproduction: init --no-auto-restart after a restart log exists (FR-13, DEC-14, cli-output.md exit codes)\n');
for (const [harness, extra] of [['claude-code', null], ['pi', '.context-brake/runtime/sessions/pi/pi-s1.jsonl'], ['codex-cli', '.context-brake/runtime/sessions/codex-cli/codex-sess-1.jsonl'], ['pi', null]]) {
  const repo = await makeRepo(`warn3-${harness}`, [harness]);
  await note(ev, `fixture ${harness}; restart log present; other runtime entry: ${extra ?? 'none'}`);
  await cli(repo, ['init', '--yes', '--auto-restart'], ev);
  await write(join(repo.root, '.context-brake/runtime/restart', harness, 's1.json'), '{}');
  if (extra) await write(join(repo.root, extra), '');
  const r = await cli(repo, ['init', '--yes', '--json', '--no-auto-restart'], ev);
  const j = JSON.parse(r.stdout);
  console.log(harness, extra ?? '-', 'exit', r.code, j.status, JSON.stringify(j.outcomes.filter(o => o.status !== 'applied')));
}
