import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { GitInspector } from '../../src/core/contracts/git.js';
import { NodeBootReader } from '../../src/infrastructure/runtime/boot-reader.js';
import { VALID_BOOT_CHECKPOINT, seedCompletedBoot, seedMalformedCheckpoint, seedValidBoot } from '../helpers/boot-fixture.js';

let root = '';
const clock = { now: () => new Date('2026-09-21T12:00:00.000Z') };
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-boot-reader-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

function reader(inspector: GitInspector, reportInspectionFailure?: () => Promise<void>): NodeBootReader {
  return new NodeBootReader({ projectRoot: root, config: DEFAULT_CONFIG, clock, gitInspector: inspector, reportInspectionFailure });
}

describe('boot reader Git inspection gate (RF14, TC-09)', () => {
  it('skips Git for missing, invalid, and completed plans', async () => {
    const inspect = vi.fn();
    const boot = reader({ inspect });
    expect(await boot.readBoot()).toEqual({ kind: 'none' });
    await seedMalformedCheckpoint(root);
    expect((await boot.readBoot()).kind).toBe('invalid_state');
    await seedCompletedBoot(root);
    expect(await boot.readBoot()).toEqual({ kind: 'none' });
    expect(inspect).not.toHaveBeenCalled();
  });
});

describe('boot reader Git comparison (RF14, RF16, TC-09, TC-10, TC-12)', () => {
  it('passes the recorded commit and renders actual divergences', async () => {
    await seedValidBoot(root);
    const checkpoint = { ...VALID_BOOT_CHECKPOINT, gitState: { ...VALID_BOOT_CHECKPOINT.gitState, lastCommitHash: 'abcd' } };
    await writeFile(join(root, 'state_checkpoint.json'), JSON.stringify(checkpoint));
    const inspect = vi.fn().mockResolvedValue({
      status: 'available', branch: 'main', headCommit: '1234',
      cleanWorkingTree: false, recordedCommit: 'outside_history',
    });
    const result = await reader({ inspect }).readBoot();
    expect(inspect).toHaveBeenCalledWith('abcd');
    expect(result.kind).toBe('boot');
    if (result.kind === 'boot') {
      expect(result.text).toContain('Checkpoint commit abcd is outside current history at 1234.');
      expect(result.text).toContain('Working tree has uncommitted changes.');
    }
  });

  it('reports omitted checks for missing Git and an inspection exception', async () => {
    await seedValidBoot(root);
    const reportInspectionFailure = vi.fn().mockResolvedValue(undefined);
    const missing = await reader({ inspect: vi.fn().mockResolvedValue({ status: 'unavailable', reason: 'git_missing' }) }).readBoot();
    const failed = await reader({ inspect: vi.fn().mockRejectedValue(new Error('process failed')) }, reportInspectionFailure).readBoot();
    expect(missing.kind === 'boot' && missing.text).toContain('Repository checks omitted: git_missing.');
    expect(failed.kind === 'boot' && failed.text).toContain('Repository checks omitted: inspection_failed.');
    expect(failed.kind === 'boot' && failed.text).toContain('Before any edit, run `npm run check` to validate step 3.');
    expect(reportInspectionFailure).toHaveBeenCalledOnce();
  });
});
