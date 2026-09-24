import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { readPlanForRun } from '../../src/infrastructure/runner/run-plan-reader.js';
import { NodeRunStateAccess } from '../../src/infrastructure/runner/node-run-state.js';
import { checkpointAt, planWithStatuses } from '../helpers/run-plans.js';

let projectRoot: string;
beforeEach(async () => { projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'cb-t08-plan-'))); });
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function writeState(plan: unknown, checkpoint?: unknown): Promise<void> {
  await writeFile(join(projectRoot, 'task_plan.json'), typeof plan === 'string' ? plan : JSON.stringify(plan), 'utf8');
  if (checkpoint !== undefined) await writeFile(join(projectRoot, 'state_checkpoint.json'), typeof checkpoint === 'string' ? checkpoint : JSON.stringify(checkpoint), 'utf8');
}

describe('readPlanForRun (DEC-21, TC-08)', () => {
  it('reports a missing plan', async () => {
    expect(await readPlanForRun(projectRoot, DEFAULT_CONFIG)).toEqual({ kind: 'missing_plan', file: 'task_plan.json' });
  });

  it('accepts a runnable plan with a matching checkpoint', async () => {
    await writeState(planWithStatuses(['PENDING']), checkpointAt('2026-09-24T00:00:00.000Z'));
    expect(await readPlanForRun(projectRoot, DEFAULT_CONFIG)).toMatchObject({ kind: 'ready', readiness: { kind: 'runnable' } });
  });

  it('accepts a complete plan without reading the checkpoint', async () => {
    await writeState(planWithStatuses(['COMPLETED']));
    expect(await readPlanForRun(projectRoot, DEFAULT_CONFIG)).toMatchObject({ kind: 'ready', readiness: { kind: 'complete' } });
  });

  it.each([
    { name: 'a plan with invalid JSON', plan: '{', checkpoint: undefined, file: 'task_plan.json', detail: '(syntax) must be valid JSON' },
    { name: 'a plan that breaks the schema', plan: { schemaVersion: 1 }, checkpoint: undefined, file: 'task_plan.json', detail: 'taskId' },
    { name: 'a missing checkpoint', plan: planWithStatuses(['PENDING']), checkpoint: undefined, file: 'state_checkpoint.json', detail: 'file is missing' },
    { name: 'a checkpoint with invalid JSON', plan: planWithStatuses(['PENDING']), checkpoint: '{', file: 'state_checkpoint.json', detail: '(syntax) must be valid JSON' },
    { name: 'a checkpoint on an unknown step', plan: planWithStatuses(['PENDING']), checkpoint: checkpointAt('2026-09-24T00:00:00.000Z', 9), file: 'state_checkpoint.json', detail: 'activeStepId' },
    { name: 'a checkpoint for another task', plan: planWithStatuses(['PENDING']), checkpoint: { ...checkpointAt('2026-09-24T00:00:00.000Z'), taskId: 'other' }, file: 'state_checkpoint.json', detail: 'taskId must match task_plan.json' },
  ])('reports $name as invalid with the file and rule', async ({ plan, checkpoint, file, detail }) => {
    await writeState(plan, checkpoint);
    const preflight = await readPlanForRun(projectRoot, DEFAULT_CONFIG);
    expect(preflight).toMatchObject({ kind: 'invalid', file });
    expect(preflight.kind === 'invalid' ? preflight.detail : '').toContain(detail);
  });
});

function paths(): { plan: string; checkpoint: string } {
  return { plan: join(projectRoot, 'task_plan.json'), checkpoint: join(projectRoot, 'state_checkpoint.json') };
}

describe('NodeRunStateAccess (RunStateAccess port)', () => {
  it('reads missing and invalid state as null', async () => {
    expect(await new NodeRunStateAccess(paths()).read()).toEqual({ plan: null, checkpoint: null });
    await writeState('{', '{"schemaVersion":1}');
    expect(await new NodeRunStateAccess(paths()).read()).toEqual({ plan: null, checkpoint: null });
  });

  it('reads valid state and writes the plan atomically', async () => {
    await writeState(planWithStatuses(['PENDING']), checkpointAt('2026-09-24T00:00:00.000Z'));
    const access = new NodeRunStateAccess(paths());
    await access.writePlan(planWithStatuses(['COMPLETED'], null));
    const reading = await access.read();
    expect(reading.plan?.steps[0]?.status).toBe('COMPLETED');
    expect(reading.checkpoint?.taskId).toBe('task');
  });
});
