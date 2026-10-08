import { afterEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { makeProject, printedFlags, projectTree, removeProjects, replay, runAssisted } from '../helpers/assistant-world.js';

type Scenario = { readonly name: string; readonly seed: readonly string[]; readonly answers: readonly string[]; readonly flags: readonly string[] };

const SPACED_SNAPSHOT_ANSWERS = ['', '/sdd snapshot', '', '', 'y', '3', '', '', 'y'];
const STORED_RESTART = ['--snapshot-command', '/sdd-snapshot', '--auto-restart', '--max-restarts', '3'];

const FRESH_SCENARIOS: readonly Scenario[] = [
  { name: 'every default', seed: [], answers: ['', '', '', '', '', 'y'], flags: [] },
  { name: 'snapshot command with a space and restart limit 3', seed: [], answers: SPACED_SNAPSHOT_ANSWERS, flags: ['--snapshot-command', '/sdd snapshot', '--auto-restart', '--max-restarts', '3'] },
  { name: 'YELLOW trigger, resume command, debug on', seed: [], answers: ['', '/s', 'YELLOW', '/resume now', 'n', '', 'y', 'y'], flags: ['--snapshot-command', '/s', '--snapshot-trigger', 'YELLOW', '--resume-command', '/resume now', '--debug'] },
  { name: 'command and resume values that start with a dash', seed: [], answers: ['', '-x', '', '-y', 'n', '', '', 'y'], flags: ['--snapshot-command=-x', '--resume-command=-y'] },
  { name: 'bridge off and debug on', seed: [], answers: ['', '', '', 'n', 'y', 'y'], flags: ['--no-statusline-bridge', '--debug'] },
  { name: 'Claude Code only with restart on', seed: [], answers: ['1', '', 'y', '', '', '', 'y'], flags: ['--harness', 'claude-code', '--exclude-harness', 'codex-cli', '--auto-restart'] },
];

const STORED_SCENARIOS: readonly Scenario[] = [
  { name: 'stored snapshot command cleared and restart turned off', seed: STORED_RESTART, answers: ['', 'none', 'n', '', '', 'y'], flags: ['--no-snapshot-command', '--no-auto-restart'] },
  { name: 'stored restart limit changed', seed: STORED_RESTART, answers: ['', '', '', '', 'y', '5', '', '', 'y'], flags: ['--max-restarts', '5'] },
  { name: 'stored status line opt-out reversed', seed: ['--no-statusline-bridge'], answers: ['', '', '', 'y', '', 'y'], flags: ['--statusline-bridge'] },
];

async function seededProject(seed: readonly string[]): Promise<string> {
  const root = await makeProject();
  if (seed.length > 0) expect((await replay(root, seed, ['--yes'])).code).toBeLessThanOrEqual(1);
  return root;
}

describe('FR-06, OBJ-01, OBJ-02 the printed command reproduces the assistant session (prd-16, TC-10)', () => {
  const roots: string[] = [];
  afterEach(async () => { await removeProjects(...roots.splice(0)); });

  it.each([...FRESH_SCENARIOS, ...STORED_SCENARIOS])('$name: same files as the replayed command and no further change (TC-10)', async ({ seed, answers, flags }) => {
    const assisted = await seededProject(seed);
    const replayed = await seededProject(seed);
    roots.push(assisted, replayed);
    const run = await runAssisted(assisted, answers);
    expect(run.code).toBeLessThanOrEqual(1);
    const printed = printedFlags(run.stdout);
    for (const flag of flags) expect(printed).toContain(flag);
    expect((await replay(replayed, printed, ['--yes'])).code).toBeLessThanOrEqual(1);
    expect(await projectTree(assisted)).toEqual(await projectTree(replayed));
    const again = installReportSchema.parse(JSON.parse((await replay(assisted, printed, ['--dry-run', '--json'])).stdout));
    expect(again.plan.changes).toEqual([]);
  });

  it('prints the same plan the replay computes before it writes (FR-06, TC-10)', async () => {
    const assisted = await makeProject();
    const replayed = await makeProject();
    roots.push(assisted, replayed);
    const run = await runAssisted(assisted, SPACED_SNAPSHOT_ANSWERS.slice(0, -1), ['--dry-run']);
    expect(run.code).toBeLessThanOrEqual(1);
    const planned = installReportSchema.parse(JSON.parse((await replay(replayed, printedFlags(run.stdout), ['--dry-run', '--json'])).stdout));
    expect(planned.plan.changes.length).toBeGreaterThan(0);
    for (const change of planned.plan.changes) expect(run.stdout).toContain(`[${change.kind}] ${change.path}`);
  });
});
