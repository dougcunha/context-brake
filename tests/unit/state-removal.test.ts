import { describe, expect, it } from 'vitest';
import type { FileSnapshot } from '../../src/core/contracts/changes.js';
import { planRuntimeStateDeletions, planStateDeletions } from '../../src/core/services/state-removal.js';

function fakeSnapshot(path: string, exists: boolean): FileSnapshot {
  return { path, realPath: `/repo/${path}`, exists, content: exists ? '{}' : null, sha256: exists ? 'sha' : null, isSymlink: false, fileIdentity: path };
}

describe('planStateDeletions (FR-09, TC-05)', () => {
  it('plans nothing when removeState is not set', () => {
    const changes = planStateDeletions({ planSnapshot: fakeSnapshot('task_plan.json', true) });
    expect(changes).toHaveLength(0);
  });

  it('plans a delete for each existing plan and checkpoint file when removeState is set', () => {
    const changes = planStateDeletions({
      removeState: true,
      planSnapshot: fakeSnapshot('task_plan.json', true),
      checkpointSnapshot: fakeSnapshot('state_checkpoint.json', false),
    });
    expect(changes).toEqual([{ path: 'task_plan.json', realPath: '/repo/task_plan.json', kind: 'delete', owner: 'config', content: null, preview: { summary: 'Delete task_plan.json' } }]);
  });
});

describe('planRuntimeStateDeletions (FR-09, TC-05)', () => {
  it('plans nothing when removeState is not set, even with existing runtime files', () => {
    const changes = planRuntimeStateDeletions(false, [fakeSnapshot('.context-brake/runtime/lock.json', true)]);
    expect(changes).toHaveLength(0);
  });

  it('plans one delete per existing runtime-state file with owner runtime_state', () => {
    const changes = planRuntimeStateDeletions(true, [
      fakeSnapshot('.context-brake/runtime/lock.json', true),
      fakeSnapshot('.context-brake/runtime/sessions/s1.json', true),
    ]);
    expect(changes).toEqual([
      { path: '.context-brake/runtime/lock.json', realPath: '/repo/.context-brake/runtime/lock.json', kind: 'delete', owner: 'runtime_state', content: null, preview: { summary: 'Delete .context-brake/runtime/lock.json' } },
      { path: '.context-brake/runtime/sessions/s1.json', realPath: '/repo/.context-brake/runtime/sessions/s1.json', kind: 'delete', owner: 'runtime_state', content: null, preview: { summary: 'Delete .context-brake/runtime/sessions/s1.json' } },
    ]);
  });
});
