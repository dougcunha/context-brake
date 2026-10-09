import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { makeGitProject, removeProject, runInit, runnerListing } from '../helpers/gitignore-world.js';

async function dryRunFindings(root: string, tracked: readonly string[]) {
  const run = await runInit(root, ['--dry-run', '--json'], runnerListing(tracked));
  return { report: installReportSchema.parse(JSON.parse(run.stdout)), code: run.code };
}

describe('FR-08 files Git already tracks (prd-17, TC-07)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { await removeProject(root); });

  it('names the tracked files and the git rm --cached command without changing the exit code (FR-08, TC-07)', async () => {
    const clean = await dryRunFindings(root, []);
    const tracked = await dryRunFindings(root, ['context-brake.config.json']);
    const finding = tracked.report.findings.find((item) => item.code === 'GITIGNORE_TRACKED_FILES');
    expect(finding?.message).toContain('context-brake.config.json');
    expect(finding?.remediation).toBe('Run: git rm --cached -- context-brake.config.json');
    expect(finding?.severity).toBe('ok');
    expect(tracked.code).toBe(clean.code);
    expect(clean.report.findings.some((item) => item.code === 'GITIGNORE_TRACKED_FILES')).toBe(false);
  });
  it('reports nothing when Git fails or the opt-out is on (FR-08, TC-07)', async () => {
    const failing = { ...runnerListing(['x']), run: () => Promise.resolve({ status: 'failed' as const, exitCode: null, stdout: '', stderr: '' }) };
    const run = await runInit(root, ['--dry-run', '--json'], failing);
    expect(installReportSchema.parse(JSON.parse(run.stdout)).findings.some((item) => item.code === 'GITIGNORE_TRACKED_FILES')).toBe(false);
    const optedOut = await runInit(root, ['--dry-run', '--json', '--no-gitignore'], runnerListing(['context-brake.config.json']));
    expect(installReportSchema.parse(JSON.parse(optedOut.stdout)).findings.some((item) => item.code === 'GITIGNORE_TRACKED_FILES')).toBe(false);
  });
});
