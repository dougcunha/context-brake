import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../src/cli/main.js';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { trackedOwnedFiles } from '../../src/infrastructure/git/git-context.js';
import { fakeOverheadMeasurer } from '../helpers/fake-overhead-measurer.js';
import { makeGitProject, removeProject } from '../helpers/gitignore-world.js';

vi.mock('../../src/infrastructure/git/git-context.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/infrastructure/git/git-context.js')>()),
  trackedOwnedFiles: vi.fn(() => Promise.resolve(['context-brake.config.json'])),
}));

describe('FR-08 the shipped CLI hands a process runner to the Git query (prd-17, CR-01)', () => {
  let root = '';
  beforeEach(async () => { root = await makeGitProject(); });
  afterEach(async () => { vi.restoreAllMocks(); await removeProject(root); });

  it('passes a runner even when the caller injected none, and reports the tracked files (FR-08, CR-01)', async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { out.push(String(chunk)); return true; });
    await main(['init', '--dry-run', '--json'], { projectRoot: root, overheadMeasurer: fakeOverheadMeasurer, terminal: { stdinIsTty: false, stdoutIsTty: false } });
    const report = installReportSchema.parse(JSON.parse(out.join('')));
    expect(report.findings.map((finding) => finding.code)).toContain('GITIGNORE_TRACKED_FILES');
    const [runner] = vi.mocked(trackedOwnedFiles).mock.calls[0] ?? [];
    expect(runner).toBeDefined();
    expect(typeof runner?.run).toBe('function');
  });
});
