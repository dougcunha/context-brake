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
  it('prunes an already-empty runtime directory when removeState is true', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-empty-runtime-')));
    try {
      await mkdir(join(dir, '.context-brake/runtime/sessions'), { recursive: true });
      const plan = createChangePlan({ projectRoot: dir, plannedChanges: [], snapshots: [] });
      const applier = new NodeChangeApplier({ removeState: true });
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
