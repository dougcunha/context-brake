import { realpath } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { makeGitProject, removeProject, runInit, runnerListing } from '../helpers/gitignore-world.js';

const TRACKED = ['context-brake.config.json', '.context-brake/manifest.json'];

async function dryRunFindings(root: string, runner: ProcessRunner, flags: readonly string[] = []) {
  const run = vi.spyOn(runner, 'run');
  const result = await runInit(root, ['--dry-run', '--json', ...flags], runner);
  const gitRequest = run.mock.calls.map(([request]) => request).find((request) => request.executable === 'git');
  return { findings: installReportSchema.parse(JSON.parse(result.stdout)).findings, code: result.code, gitArgs: gitRequest?.args };
}

describe('FR-08 files Git already tracks (prd-17, TC-07)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { vi.restoreAllMocks(); await removeProject(root); });

  it('asks git ls-files, names the tracked files and the git rm --cached command without changing the exit code (FR-08, TC-07)', async () => {
    const clean = await dryRunFindings(root, runnerListing([]));
    const tracked = await dryRunFindings(root, runnerListing(TRACKED));
    const finding = tracked.findings.find((item) => item.code === 'GITIGNORE_TRACKED_FILES');
    expect(tracked.gitArgs?.slice(0, 5)).toEqual(['-C', await realpath(root), 'ls-files', '-z', '--']);
    expect(finding?.message).toContain(TRACKED.join(', '));
    expect([finding?.remediation, finding?.severity]).toEqual([`Run: git rm --cached -- ${TRACKED.join(' ')}`, 'ok']);
    expect(tracked.code).toBe(clean.code);
    expect(clean.findings.some((item) => item.code === 'GITIGNORE_TRACKED_FILES')).toBe(false);
  });
  it('reports nothing when Git exits with an error or the opt-out is on (FR-08, TC-07)', async () => {
    const failing = { ...runnerListing([]), run: () => Promise.resolve({ status: 'completed' as const, exitCode: 128, stdout: `${TRACKED[0]}\0`, stderr: '' }) };
    const failed = await dryRunFindings(root, failing);
    const optedOut = await dryRunFindings(root, runnerListing(TRACKED), ['--no-gitignore']);
    expect([...failed.findings, ...optedOut.findings].some((item) => item.code === 'GITIGNORE_TRACKED_FILES')).toBe(false);
    expect(optedOut.gitArgs).toBeUndefined();
  });
});
