import { describe, expect, it } from 'vitest';
import type { FileSnapshot, HarnessInstallPlan, PlannedChange } from '../../src/core/contracts/changes.js';
import { createChangePlan, hashString, SNAPSHOT_MISSING_CODE } from '../../src/core/services/change-plan-service.js';

const root = '/repo';
const hashB1 = hashString('{"v":1}');
const snapA: FileSnapshot = { path: 'b.json', realPath: '/repo/b.json', exists: true, content: '{"v":1}', sha256: hashB1, isSymlink: false, fileIdentity: 'id-b' };
const snapB: FileSnapshot = { path: 'a.json', realPath: '/repo/a.json', exists: false, content: null, sha256: null, isSymlink: false, fileIdentity: 'id-a' };
const planA: PlannedChange = { path: 'b.json', realPath: '/repo/b.json', kind: 'update', owner: 'config', content: '{"v":2}', preview: { summary: 'Update b.json' } };
const planB: PlannedChange = { path: 'a.json', realPath: '/repo/a.json', kind: 'create', owner: 'config', content: '{"v":1}', preview: { summary: 'Create a.json' } };

function harnessPlan(harness: HarnessInstallPlan['harness']): HarnessInstallPlan {
  return { harness, outcome: 'planned', supportLevel: 'full', limitations: [] };
}

describe('shared change plan between preview and apply (UT-10, CA-11)', () => {
  it('orders changes and harnesses and records the before and after hashes', () => {
    const harnesses = [harnessPlan('cursor'), harnessPlan('claude-code')];
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [planA, planB], snapshots: [snapA, snapB], harnesses });
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.changes.map((change) => [change.path, change.beforeSha256, change.afterSha256])).toEqual([['a.json', null, hashB1], ['b.json', hashB1, hashString('{"v":2}')]]);
    expect(plan.harnesses.map((harness) => harness.harness)).toEqual(['claude-code', 'cursor']);
  });
});

describe('conflict isolation and idempotence (UT-05, CA-05, CA-06)', () => {
  it('isolates conflicts sorted by path while allowing valid changes to be planned', () => {
    const conflicts = [{ path: 'z.json', code: 'INVALID_HARNESS_CONFIG', detail: 'Syntax error' }, { path: 'broken.json', code: 'INVALID_HARNESS_CONFIG', detail: 'Syntax error' }];
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [planB], snapshots: [snapB], conflicts });
    expect(plan.conflicts.map((conflict) => conflict.path)).toEqual(['broken.json', 'z.json']);
    expect(plan.changes.map((change) => change.path)).toEqual(['a.json']);
  });

  it('omits no-op modifications when before and after hashes match', () => {
    const unchangedPlan: PlannedChange = { path: 'b.json', realPath: '/repo/b.json', kind: 'update', owner: 'config', content: '{"v":1}', preview: { summary: 'No-op' } };
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [unchangedPlan], snapshots: [snapA] });
    expect(plan.changes).toHaveLength(0);
    expect(plan.requiresConfirmation).toBe(false);
  });

  it.each([
    ['plans an identical duplicate once', planB, []],
    ['reports a duplicate with other content as a conflict', { ...planB, content: '{"v":3}' }, ['CONFLICTING_CHANGES']],
  ])('%s', (_label, duplicate, codes) => {
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [planB, duplicate], snapshots: [snapB] });
    expect(plan.changes.map((change) => change.content)).toEqual(['{"v":1}']);
    expect(plan.conflicts.map((conflict) => conflict.code)).toEqual(codes);
  });
});

describe('planned changes without a matching snapshot become conflicts (UT-11, CA-11, CA-12)', () => {
  it('reports a delete, an update, and a create without a matching snapshot instead of dropping them', () => {
    const strayDelete: PlannedChange = { path: 'c.json', realPath: '/linked/repo/c.json', kind: 'delete', owner: 'manifest', content: null, preview: { summary: 'Delete c.json' } };
    const strayUpdate: PlannedChange = { ...planA, realPath: '/linked/repo/b.json' };
    const strayCreate: PlannedChange = { ...planB, realPath: '/linked/repo/a.json' };
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [strayDelete, strayUpdate, strayCreate], snapshots: [snapA, snapB] });
    expect(plan.changes).toHaveLength(0);
    expect(plan.conflicts.map((conflict) => [conflict.path, conflict.code])).toEqual([['a.json', SNAPSHOT_MISSING_CODE], ['b.json', SNAPSHOT_MISSING_CODE], ['c.json', SNAPSHOT_MISSING_CODE]]);
    expect(plan.requiresConfirmation).toBe(false);
  });
});

describe('deletes of files already absent stay silent (UT-11, CA-12)', () => {
  it('skips a delete whose matching snapshot records an absent file', () => {
    const absentDelete: PlannedChange = { path: 'a.json', realPath: '/repo/a.json', kind: 'delete', owner: 'manifest', content: null, preview: { summary: 'Delete a.json' } };
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [absentDelete], snapshots: [snapB] });
    expect(plan.changes).toHaveLength(0);
    expect(plan.conflicts).toHaveLength(0);
  });
});
