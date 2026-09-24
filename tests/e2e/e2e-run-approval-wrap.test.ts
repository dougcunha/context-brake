import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { prepareAcceptanceProject, readJournal, runAcceptance, workSteps, type AcceptanceHarness } from '../helpers/run-acceptance.js';
import { createRunProject, readPlanStatuses, removeRunProject, useScenario, type RunProject } from '../helpers/run-project.js';

const WRAPPED_OUTPUT = 'wrapped-command-output';
const TELEMETRY_BLOCK = /^\[ContextBrake v1\] turn=\d+\/\d+ usage=\d+% tokens=\d+\/\d+ source=\w+ zone=\w+ action=.+$/;

type WrapResult = { readonly code: number | null; readonly stdout: string; readonly stderr: string };

let world: RunProject;
beforeEach(async () => { world = await createRunProject('cb-e2e-run-approval-'); });
afterEach(async () => { await removeRunProject(world); });

describe('E2E run: step approval without a TTY (TC-24, CA-08, RF11, DEC-17)', () => {
  it('stops after the first validated step with exit 4 and opens no further session', async () => {
    await prepareAcceptanceProject(world, { harness: 'claude-code', steps: workSteps(3) });
    await useScenario(world, { work: true, checkpoint: true });
    const run = await runAcceptance(world, ['--harness', 'claude-code', '--approve-steps']);
    expect(run.code).toBe(4);
    expect(run.summary).toMatchObject({ stopReason: 'step_not_approved', sessionCount: 1, stepsCompleted: 1 });
    expect(await readJournal(world)).toHaveLength(1);
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED', 'IN_PROGRESS', 'PENDING']);
  });
});

describe('E2E run: wrap inside a runner session (TC-24, CA-12, RF16, DEC-19)', () => {
  it.each<AcceptanceHarness>(['claude-code', 'codex-cli'])('follows the wrapped output with the telemetry block of that %s session', async (harness) => {
    const output = join(world.root, 'wrap.json');
    const wrap = { argv: ['node', '-e', `console.log('${WRAPPED_OUTPUT}')`], output };
    await prepareAcceptanceProject(world, { harness, steps: workSteps(1) });
    await useScenario(world, { work: true, checkpoint: true, wrap });
    const run = await runAcceptance(world, ['--harness', harness]);
    expect(run.code, run.stderr).toBe(0);
    const result = JSON.parse(await readFile(output, 'utf8')) as WrapResult;
    const lines = result.stdout.trim().split(/\r?\n/);
    expect(result.code).toBe(0);
    expect(lines.slice(0, 2)).toEqual([WRAPPED_OUTPUT, '']);
    expect(lines[2]).toMatch(TELEMETRY_BLOCK);
    expect(lines).toHaveLength(3);
    expect(result.stderr).not.toContain('WARN');
    expect((await readJournal(world))[0]?.runId).toBe(run.summary.runId);
  });
});
