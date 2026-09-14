import { describe, expect, it } from 'vitest';
import type { FileSnapshot, PlannedChange } from '../../src/core/contracts/changes.js';
import { createChangePlan, hashString, SNAPSHOT_MISSING_CODE } from '../../src/core/services/change-plan-service.js';

const root = '/repo';
const hashB1 = hashString('{"v":1}');
const snapA: FileSnapshot = { path: 'b.json', realPath: '/repo/b.json', exists: true, content: '{"v":1}', sha256: hashB1, isSymlink: false, fileIdentity: 'id-b' };
const snapB: FileSnapshot = { path: 'a.json', realPath: '/repo/a.json', exists: false, content: null, sha256: null, isSymlink: false, fileIdentity: 'id-a' };
const planA: PlannedChange = { path: 'b.json', realPath: '/repo/b.json', kind: 'update', owner: 'config', content: '{"v":2}', preview: { summary: 'Update b.json' } };
const planB: PlannedChange = { path: 'a.json', realPath: '/repo/a.json', kind: 'create', owner: 'config', content: '{"v":1}', preview: { summary: 'Create a.json' } };

describe('shared change plan between preview and apply (UT-10, CA-11)', () => {
  it('shares one change plan between dry-run preview and apply', () => {
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [planA, planB], snapshots: [snapA, snapB] });
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.changes).toHaveLength(2);
    expect(plan.changes[0]?.path).toBe('a.json');
    expect(plan.changes[0]?.beforeSha256).toBeNull();
    expect(plan.changes[0]?.afterSha256).toBeDefined();
    expect(plan.changes[1]?.path).toBe('b.json');
    expect(plan.changes[1]?.beforeSha256).toBe(hashB1);
  });
});

describe('conflict isolation and idempotence (UT-05, CA-05, CA-06)', () => {
  it('isolates conflicts while allowing valid changes to be planned', () => {
    const conflict = { path: 'broken.json', code: 'INVALID_HARNESS_CONFIG', detail: 'Syntax error' };
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [planB], snapshots: [snapB], conflicts: [conflict] });
    expect(plan.conflicts).toHaveLength(1);
    expect(plan.conflicts[0]?.code).toBe('INVALID_HARNESS_CONFIG');
    expect(plan.changes).toHaveLength(1);
    expect(plan.changes[0]?.path).toBe('a.json');
  });

  it('omits no-op modifications when before and after hashes match', () => {
    const unchangedPlan: PlannedChange = { path: 'b.json', realPath: '/repo/b.json', kind: 'update', owner: 'config', content: '{"v":1}', preview: { summary: 'No-op' } };
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [unchangedPlan], snapshots: [snapA] });
    expect(plan.changes).toHaveLength(0);
    expect(plan.requiresConfirmation).toBe(false);
  });
});

describe('planned changes without a matching snapshot become conflicts (UT-11, CA-11, CA-12)', () => {
  it('reports a delete whose target has no matching snapshot instead of dropping it', () => {
    const strayDelete: PlannedChange = { path: 'b.json', realPath: '/linked/repo/b.json', kind: 'delete', owner: 'manifest', content: null, preview: { summary: 'Delete b.json' } };
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [strayDelete], snapshots: [snapA, snapB] });
    expect(plan.changes).toHaveLength(0);
    expect(plan.conflicts).toEqual([expect.objectContaining({ path: 'b.json', code: SNAPSHOT_MISSING_CODE })]);
  });

  it('reports an update and a create without a matching snapshot as conflicts', () => {
    const strayUpdate: PlannedChange = { ...planA, realPath: '/linked/repo/b.json' };
    const strayCreate: PlannedChange = { ...planB, realPath: '/linked/repo/a.json' };
    const plan = createChangePlan({ projectRoot: root, plannedChanges: [strayUpdate, strayCreate], snapshots: [snapA, snapB] });
    expect(plan.changes).toHaveLength(0);
    expect(plan.conflicts.map((conflict) => conflict.code)).toEqual([SNAPSHOT_MISSING_CODE, SNAPSHOT_MISSING_CODE]);
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
