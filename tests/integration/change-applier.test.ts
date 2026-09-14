import { mkdtemp, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';

describe('filesystem dry-run side-effect free guarantee (IT-08, CA-11)', () => {
  it('leaves directory snapshot completely identical in dry-run mode', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-dryrun-')));
    try {
      const fileA = join(dir, 'a.txt');
      await writeFile(fileA, 'original content', 'utf8');
      const snapsBefore = await snapshotFiles(dir, ['a.txt', 'b.txt']);
      const plan = createChangePlan({
        projectRoot: dir,
        plannedChanges: [
          { path: 'a.txt', realPath: fileA, kind: 'update', owner: 'config', content: 'new content', preview: { summary: 'Update a.txt' } },
          { path: 'b.txt', realPath: join(dir, 'b.txt'), kind: 'create', owner: 'config', content: 'created', preview: { summary: 'Create b.txt' } },
        ],
        snapshots: snapsBefore,
      });
      expect(plan.changes).toHaveLength(2);
      const snapsAfter = await snapshotFiles(dir, ['a.txt', 'b.txt']);
      expect(snapsAfter[0]?.content).toBe('original content');
      expect(snapsAfter[1]?.exists).toBe(false);
      const dirEntries = await readdir(dir);
      expect(dirEntries).toEqual(['a.txt']);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('optimistic concurrency rejection (IT-15, CA-05, CA-11)', () => {
  it('rejects a concurrent edit when precondition hash changes', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-concurrent-')));
    try {
      const targetPath = join(dir, 'CLAUDE.md');
      await writeFile(targetPath, '# Initial Content\n', 'utf8');
      const snaps = await snapshotFiles(dir, ['CLAUDE.md']);
      const plan = createChangePlan({
        projectRoot: dir,
        plannedChanges: [{ path: 'CLAUDE.md', realPath: targetPath, kind: 'update', owner: 'instruction_block', content: '# Planned Update\n', preview: { summary: 'Update' } }],
        snapshots: snaps,
      });
      await writeFile(targetPath, '# Concurrent Edit By User\n', 'utf8');
      const applier = new NodeChangeApplier();
      const report = await applier.apply(plan);
      expect(report.status).toBe('errors');
      expect(report.exitCode).toBe(2);
      expect(report.outcomes[0]?.status).toBe('failed');
      expect(report.outcomes[0]?.detail).toContain('FILE_CHANGED_SINCE_PREVIEW');
      expect(await readFile(targetPath, 'utf8')).toBe('# Concurrent Edit By User\n');
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

describe('deletion and warnings outcome (CA-12)', () => {
  it('handles file deletion, conflicts, and warnings correctly', async () => {
    const dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-delete-')));
    try {
      const toDelete = join(dir, 'del.txt');
      await writeFile(toDelete, 'delete me', 'utf8');
      const snaps = await snapshotFiles(dir, ['del.txt']);
      const plan = createChangePlan({
        projectRoot: dir,
        plannedChanges: [{ path: 'del.txt', realPath: toDelete, kind: 'delete', owner: 'manifest', content: null, preview: { summary: 'Delete' } }],
        conflicts: [{ path: 'warn.txt', code: 'SKIPPED_ITEM', detail: 'Skipped' }],
        snapshots: snaps,
      });
      const applier = new NodeChangeApplier();
      const report = await applier.apply(plan);
      expect(report.status).toBe('warnings');
      expect(report.exitCode).toBe(1);
      expect(await stat(toDelete).catch(() => null)).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
