import { lstat, mkdir, mkdtemp, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';

const NOT_EMPTY = 'Directory is not empty: 1 remaining entry ContextBrake did not delete.';

let dir: string;
beforeEach(async () => { dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-prune-'))); });
afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

describe('empty runtime-state directory pruning (FR-09, TC-05)', () => {
  it('prunes already-empty nested runtime directories when pruneRuntime is true (DEC-04)', async () => {
    await mkdir(join(dir, '.context-brake/runtime/restart/pi'), { recursive: true });
    const plan = createChangePlan({ projectRoot: dir, plannedChanges: [], snapshots: [] });
    const report = await new NodeChangeApplier({ pruneRuntime: true }).apply(plan);
    expect(report.status).toBe('success');
    expect(await exists(join(dir, '.context-brake'))).toBe(false);
  });

  it('never prunes through a runtime directory that is a link', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'cb-prune-outside-'));
    await mkdir(join(dir, '.context-brake'), { recursive: true });
    await symlink(outside, join(dir, '.context-brake/runtime'), process.platform === 'win32' ? 'junction' : 'dir');
    const plan = createChangePlan({ projectRoot: dir, plannedChanges: [], snapshots: [] });
    const report = await new NodeChangeApplier({ pruneRuntime: true }).apply(plan);
    expect(report.outcomes).toEqual([{ path: '.context-brake/runtime', status: 'skipped', detail: 'Directory is a symbolic link; pruning never follows it.' }]);
    expect((await lstat(join(dir, '.context-brake/runtime'))).isSymbolicLink()).toBe(true);
    expect(await exists(outside)).toBe(true);
    await rm(outside, { recursive: true, force: true });
  });
});

async function restartLogPlan(): Promise<ReturnType<typeof createChangePlan>> {
  const logPath = join(dir, '.context-brake/runtime/restart/pi/s1.json');
  await mkdir(join(dir, '.context-brake/runtime/restart/pi'), { recursive: true });
  await mkdir(join(dir, '.context-brake/runtime/sessions'), { recursive: true });
  await writeFile(logPath, '{}', 'utf8');
  await writeFile(join(dir, '.context-brake/runtime/sessions/keep.json'), '{}', 'utf8');
  const snapshots = await snapshotFiles(dir, ['.context-brake/runtime/restart/pi/s1.json']);
  return createChangePlan({ projectRoot: dir, plannedChanges: [{ path: '.context-brake/runtime/restart/pi/s1.json', realPath: logPath, kind: 'delete', owner: 'runtime_state', content: null, preview: { summary: 'Delete s1.json' } }], snapshots });
}

describe('non-empty directory reporting follows the caller (prd-14 FR-13, DEC-14, qa_01 BUG-02, codereview_08)', () => {
  it('reports each runtime directory left non-empty, deepest first, when remove prunes the runtime', async () => {
    const report = await new NodeChangeApplier({ pruneRuntime: true }).apply(await restartLogPlan());
    expect(report.outcomes).toEqual([
      { path: '.context-brake/runtime/restart/pi/s1.json', status: 'applied', detail: null },
      { path: '.context-brake/runtime/restart/pi', status: 'applied', detail: null },
      { path: '.context-brake/runtime/sessions', status: 'skipped', detail: NOT_EMPTY },
      { path: '.context-brake/runtime/restart', status: 'applied', detail: null },
      { path: '.context-brake/runtime', status: 'skipped', detail: NOT_EMPTY },
    ]);
  });

  it('prunes the emptied restart folders silently when another caller deletes a restart log', async () => {
    const report = await new NodeChangeApplier().apply(await restartLogPlan());
    expect(report.status).toBe('success');
    expect(report.outcomes.filter((outcome) => outcome.status === 'skipped')).toEqual([]);
    expect(await exists(join(dir, '.context-brake/runtime/restart'))).toBe(false);
    expect(await readFile(join(dir, '.context-brake/runtime/sessions/keep.json'), 'utf8')).toBe('{}');
  });
});
