import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodePlanValidationReader } from '../../src/infrastructure/runtime/plan-validation-reader.js';

const PLAN_FILE = 'task_plan.json';

async function writePlan(root: string, content: string): Promise<void> {
  await writeFile(join(root, PLAN_FILE), content, 'utf8');
}
function reader(root: string): NodePlanValidationReader {
  return new NodePlanValidationReader(root, PLAN_FILE);
}

describe('provisional plan reader (RF18, DEC-18, TC-30)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t04-plan-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reads the validation command of the current step', async () => {
    await writePlan(tempDir, JSON.stringify({ currentStepId: 'step-2', steps: [{ id: 'step-1', status: 'COMPLETED', validationCommand: 'npm test' }, { id: 'step-2', status: 'PENDING', validationCommand: 'npm run build' }] }));
    expect(await reader(tempDir).readValidationCommand()).toBe('npm run build');
  });
  it('falls back to the in-progress step and then to the last completed step', async () => {
    await writePlan(tempDir, JSON.stringify({ steps: [{ id: 1, status: 'COMPLETED', validationCommand: 'npm test' }, { id: 2, status: 'IN_PROGRESS', validationCommand: 'npm run build' }] }));
    expect(await reader(tempDir).readValidationCommand()).toBe('npm run build');
    await writePlan(tempDir, JSON.stringify({ steps: [{ id: 1, status: 'COMPLETED', validationCommand: 'npm test' }, { id: 2, status: 'COMPLETED', validationCommand: 'npm run lint' }] }));
    expect(await reader(tempDir).readValidationCommand()).toBe('npm run lint');
  });
  it('tolerates extra plan fields and returns nothing without a command', async () => {
    await writePlan(tempDir, JSON.stringify({ currentStepId: 'a', title: 'ignored', steps: [{ id: 'a', status: 'IN_PROGRESS', title: 'ignored' }] }));
    expect(await reader(tempDir).readValidationCommand()).toBeNull();
  });
  it('returns nothing for invalid JSON, a missing file, or an invalid shape', async () => {
    await writePlan(tempDir, 'not json');
    expect(await reader(tempDir).readValidationCommand()).toBeNull();
    expect(await reader(join(tempDir, 'absent')).readValidationCommand()).toBeNull();
    await writePlan(tempDir, JSON.stringify({ currentStepId: 'a', steps: [{ id: 'a' }] }));
    expect(await reader(tempDir).readValidationCommand()).toBeNull();
  });
});
