import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';

describe('runtime-state changed-file race leaves its directory unpruned (FR-09, TC-05)', () => {
  it('fails the changed runtime file and never prunes its still non-empty directory', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-runtime-race-')));
    try {
      await mkdir(join(dir, '.context-brake/runtime'), { recursive: true });
      const lockPath = join(dir, '.context-brake/runtime/lock.json');
      await writeFile(lockPath, '{"v":1}', 'utf8');
      const snaps = await snapshotFiles(dir, ['.context-brake/runtime/lock.json']);
      const plan = createChangePlan({
        projectRoot: dir,
        plannedChanges: [{ path: '.context-brake/runtime/lock.json', realPath: lockPath, kind: 'delete', owner: 'runtime_state', content: null, preview: { summary: 'Delete lock.json' } }],
        snapshots: snaps,
      });
      await writeFile(lockPath, '{"v":2}', 'utf8');
      const applier = new NodeChangeApplier();
      const report = await applier.apply(plan);
      expect(report.outcomes[0]?.status).toBe('failed');
      expect(report.outcomes[0]?.detail).toContain('FILE_CHANGED_SINCE_PREVIEW');
      expect(await stat(join(dir, '.context-brake/runtime')).then(() => true).catch(() => false)).toBe(true);
      expect(await readFile(lockPath, 'utf8')).toBe('{"v":2}');
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});

describe('empty runtime-state directory pruning (FR-09, TC-05)', () => {
  it('prunes an already-empty runtime directory when pruneRuntime is true (DEC-04)', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-empty-runtime-')));
    try {
      await mkdir(join(dir, '.context-brake/runtime/sessions'), { recursive: true });
      const plan = createChangePlan({ projectRoot: dir, plannedChanges: [], snapshots: [] });
      const applier = new NodeChangeApplier({ pruneRuntime: true });
      const report = await applier.apply(plan);
      expect(report.status).toBe('success');
      const runtimeExists = await stat(join(dir, '.context-brake/runtime')).then(() => true).catch(() => false);
      const rootExists = await stat(join(dir, '.context-brake')).then(() => true).catch(() => false);
      expect(runtimeExists).toBe(false);
      expect(rootExists).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});

async function restartLogPlan(dir: string): Promise<ReturnType<typeof createChangePlan>> {
  const logPath = join(dir, '.context-brake/runtime/restart/pi/s1.json');
  await mkdir(join(dir, '.context-brake/runtime/restart/pi'), { recursive: true });
  await writeFile(logPath, '{}', 'utf8');
  await writeFile(join(dir, '.context-brake/runtime/keep.json'), '{}', 'utf8');
  const snapshots = await snapshotFiles(dir, ['.context-brake/runtime/restart/pi/s1.json']);
  return createChangePlan({ projectRoot: dir, plannedChanges: [{ path: '.context-brake/runtime/restart/pi/s1.json', realPath: logPath, kind: 'delete', owner: 'runtime_state', content: null, preview: { summary: 'Delete s1.json' } }], snapshots });
}

describe('non-empty directory reporting follows the caller (prd-14 FR-13, DEC-14, qa_01 BUG-02, codereview_08)', () => {
  it('reports the runtime directory left non-empty when remove prunes the runtime', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-prune-remove-')));
    try {
      const report = await new NodeChangeApplier({ pruneRuntime: true }).apply(await restartLogPlan(dir));
      expect(report.outcomes).toContainEqual({ path: '.context-brake/runtime', status: 'skipped', detail: 'Directory is not empty: 1 remaining entry ContextBrake did not delete.' });
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
  it('prunes the emptied restart folders silently when another caller deletes a restart log', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-prune-init-')));
    try {
      const report = await new NodeChangeApplier().apply(await restartLogPlan(dir));
      expect(report.status).toBe('success');
      expect(report.outcomes.filter((outcome) => outcome.status === 'skipped')).toEqual([]);
      expect(await stat(join(dir, '.context-brake/runtime/restart')).then(() => true).catch(() => false)).toBe(false);
      expect(await readFile(join(dir, '.context-brake/runtime/keep.json'), 'utf8')).toBe('{}');
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
