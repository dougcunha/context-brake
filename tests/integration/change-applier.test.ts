import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChangeKind, ChangeOwner } from '../../src/core/contracts/changes.js';
import { createChangePlan } from '../../src/core/services/change-plan-service.js';
import { NodeChangeApplier } from '../../src/infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';

const SIBLING = 'other.json';
const HASH_MISMATCH = /^FILE_CHANGED_SINCE_PREVIEW: expected [0-9a-f]{64}, found [0-9a-f]{64}$/;

type Race = { label: string; path: string; kind: ChangeKind; owner: ChangeOwner; before: string | null; planned: string | null; userEdit: string | null; detail: RegExp };

const RACES: Race[] = [
  { label: 'edited after the plan (IT-15, CA-05)', path: 'settings.json', kind: 'update', owner: 'harness_entry', before: '{"a":1}\n', planned: '{"a":2}\n', userEdit: '{"user":1}\n', detail: HASH_MISMATCH },
  { label: 'created after the plan', path: 'settings.json', kind: 'create', owner: 'harness_entry', before: null, planned: '{"a":2}\n', userEdit: '{"user":1}\n', detail: /^FILE_CHANGED_SINCE_PREVIEW: file was created after plan was computed$/ },
  { label: 'deleted after the plan', path: 'settings.json', kind: 'update', owner: 'harness_entry', before: '{"a":1}\n', planned: '{"a":2}\n', userEdit: null, detail: /^FILE_CHANGED_SINCE_PREVIEW: file was deleted after plan was computed$/ },
  { label: 'a runtime file edited after its delete was planned (FR-09, TC-05)', path: '.context-brake/runtime/lock.json', kind: 'delete', owner: 'runtime_state', before: '{"v":1}', planned: null, userEdit: '{"v":2}', detail: HASH_MISMATCH },
];

let dir: string;
beforeEach(async () => { dir = await realpath(await mkdtemp(join(tmpdir(), 'cb-applier-'))); });
afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function writeOrRemove(path: string, content: string | null): Promise<void> {
  if (content === null) return rm(path, { force: true });
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

async function planRace(race: Race): Promise<ReturnType<typeof createChangePlan>> {
  await writeOrRemove(join(dir, race.path), race.before);
  const snapshots = await snapshotFiles(dir, [race.path, SIBLING]);
  const target = { path: race.path, realPath: join(dir, race.path), kind: race.kind, owner: race.owner, content: race.planned, preview: { summary: race.label } };
  const sibling = { path: SIBLING, realPath: join(dir, SIBLING), kind: 'create' as const, owner: 'config' as const, content: 'sibling', preview: { summary: 'Create the sibling' } };
  return createChangePlan({ projectRoot: dir, plannedChanges: [target, sibling], snapshots });
}

describe('optimistic concurrency rejection (IT-15, CA-05, CA-11)', () => {
  it.each(RACES)('fails a target $label, keeps the user state, and still applies the other changes', async (race) => {
    const plan = await planRace(race);
    await writeOrRemove(join(dir, race.path), race.userEdit);
    const report = await new NodeChangeApplier().apply(plan);
    expect([report.status, report.exitCode]).toEqual(['errors', 2]);
    expect(report.outcomes).toHaveLength(2);
    expect(report.outcomes).toContainEqual({ path: race.path, status: 'failed', detail: expect.stringMatching(race.detail) });
    expect(report.outcomes).toContainEqual({ path: SIBLING, status: 'applied', detail: null });
    expect(await readFile(join(dir, race.path), 'utf8').catch(() => null)).toBe(race.userEdit);
    expect(await readFile(join(dir, SIBLING), 'utf8')).toBe('sibling');
  });
});

describe('deletion and warnings outcome (CA-12)', () => {
  it('deletes the file and reports a plan conflict as a skipped warning', async () => {
    await writeFile(join(dir, 'del.txt'), 'delete me', 'utf8');
    const snapshots = await snapshotFiles(dir, ['del.txt']);
    const plan = createChangePlan({
      projectRoot: dir,
      plannedChanges: [{ path: 'del.txt', realPath: join(dir, 'del.txt'), kind: 'delete', owner: 'manifest', content: null, preview: { summary: 'Delete' } }],
      conflicts: [{ path: 'warn.txt', code: 'SKIPPED_ITEM', detail: 'Skipped' }],
      snapshots,
    });
    const report = await new NodeChangeApplier().apply(plan);
    expect(report).toEqual({ status: 'warnings', exitCode: 1, outcomes: [{ path: 'del.txt', status: 'applied', detail: null }, { path: 'warn.txt', status: 'skipped', detail: 'SKIPPED_ITEM: Skipped' }] });
    expect(await readFile(join(dir, 'del.txt'), 'utf8').catch(() => null)).toBeNull();
  });
});
