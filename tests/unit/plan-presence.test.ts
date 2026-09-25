import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodePlanPresence } from '../../src/infrastructure/runtime/plan-presence.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-presence-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('plan presence on disk (DEC-02, FR-01)', () => {
  it('reports a missing plan file as absent', async () => {
    expect(await new NodePlanPresence(root, 'task_plan.json').exists()).toBe(false);
  });
  it('reports an existing plan file, valid or not, as present', async () => {
    await writeFile(join(root, 'task_plan.json'), 'not json', 'utf8');
    expect(await new NodePlanPresence(root, 'task_plan.json').exists()).toBe(true);
  });
  it('treats a stat error other than a missing file as present, which keeps plan mode', async () => {
    const denied = Object.assign(new Error('denied'), { code: 'EACCES' });
    expect(await new NodePlanPresence(root, 'task_plan.json', async () => { throw denied; }).exists()).toBe(true);
  });
});
