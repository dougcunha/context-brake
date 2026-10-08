import { cli, makeRepo, write } from './lib.mjs';
import { join } from 'node:path';
for (const variant of ['log', 'archive', 'both']) {
  const repo = await makeRepo('warn-probe2', ['claude-code']);
  await cli(repo, ['init', '--yes', '--auto-restart'], null);
  await write(join(repo.root, '.context-brake/handoff.md'), '# P\n');
  if (variant !== 'log') await write(join(repo.root, '.context-brake/handoffs/20260101T000000.000Z.md'), '# A\n');
  if (variant !== 'archive') await write(join(repo.root, '.context-brake/runtime/restart/claude-code/qa.json'), '{}');
  const r = await cli(repo, ['init', '--yes', '--json', '--no-auto-restart'], null);
  const j = JSON.parse(r.stdout);
  console.log(variant, 'exit', r.code, 'status', j.status, JSON.stringify(j.outcomes.filter(o => o.status !== 'applied')), JSON.stringify(j.findings.map(f => [f.code, f.severity])));
}
