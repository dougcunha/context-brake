import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApprovalsFile } from '../../src/core/contracts/run-records.js';
import { emptyApprovals, NodeApprovalStore } from '../../src/infrastructure/runner/node-approval-store.js';
import { approvalsPath, runnerDirectory } from '../../src/infrastructure/runner/run-paths.js';

const HASH = 'a'.repeat(64);
const approvals: ApprovalsFile = { v: 1, approved: [{ hash: HASH, stepId: 2, approvedAt: '2026-09-23T10:00:00.000Z' }] };

let projectRoot: string;
beforeEach(async () => { projectRoot = await mkdtemp(join(tmpdir(), 'cb-t05-approvals-')); });
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('approval store (TC-13, RF14, DEC-10)', () => {
  it('reads no approvals before any were recorded', async () => {
    expect(await new NodeApprovalStore(projectRoot).read()).toEqual(emptyApprovals());
  });

  it('round-trips approved hashes under the git-ignored runtime directory', async () => {
    await new NodeApprovalStore(projectRoot).write(approvals);
    expect(await new NodeApprovalStore(projectRoot).read()).toEqual(approvals);
    const runtimeDirectory = dirname(runnerDirectory(projectRoot));
    expect(approvalsPath(projectRoot).startsWith(runtimeDirectory)).toBe(true);
    expect(await readFile(join(runtimeDirectory, '.gitignore'), 'utf8')).toBe('*\n');
  });

  it.each([
    ['unparseable JSON', '{"v": 1, "approved": ['],
    ['a schema violation', JSON.stringify({ v: 1, approved: [{ hash: 'short', stepId: 2, approvedAt: 'x' }] })],
  ])('renames a file with %s and treats it as empty', async (_case, content) => {
    await mkdir(runnerDirectory(projectRoot), { recursive: true });
    await writeFile(approvalsPath(projectRoot), content, 'utf8');
    const store = new NodeApprovalStore(projectRoot, () => new Date('2026-09-23T10:00:00.000Z'));
    expect(await store.read()).toEqual(emptyApprovals());
    const entries = await readdir(runnerDirectory(projectRoot));
    expect(entries).toEqual(['approvals.invalid-2026-09-23T10-00-00-000Z.json']);
    expect(await readFile(join(runnerDirectory(projectRoot), entries[0] ?? ''), 'utf8')).toBe(content);
  });

  it('refuses to write an invalid approvals document', async () => {
    const invalid = { v: 1, approved: [{ hash: 'short', stepId: 2, approvedAt: 'x' }] } as unknown as ApprovalsFile;
    await expect(new NodeApprovalStore(projectRoot).write(invalid)).rejects.toThrow();
  });
});
