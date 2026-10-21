import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';
import { CLAUDE_HOOK, createFixWorld, installClaude, makeAssetModified, makeAssetOutdated, removeFixWorld } from '../helpers/fix-world.js';

describe('doctor fix groups (FR-01, TC-05)', () => {
  let root: string;
  beforeEach(async () => { root = await createFixWorld('cb-doctor-fix-'); });
  afterEach(async () => { await removeFixWorld(root); });

  it('marks an outdated asset as automatic and leaves ok findings without a fix group', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    const report = doctorReportSchema.parse(JSON.parse((await runInProcessCli(['doctor', '--json'], root)).stdout));
    expect(report.findings.find((finding) => finding.code === 'ASSET_OUTDATED')).toMatchObject({ path: CLAUDE_HOOK, fix: { group: 'automatic' } });
    expect(report.findings.filter((finding) => finding.severity === 'ok').every((finding) => finding.fix === undefined)).toBe(true);
  });

  it('points a modified asset to context-brake fix in the text output (FR-02)', async () => {
    await installClaude(root);
    await makeAssetModified(root);
    const run = await runInProcessCli(['doctor'], root);
    expect(run.stdout.split('\n')[0]).toMatch(/, 1 fixable\)$/);
    expect(run.stdout).toContain('Fix: run context-brake fix');
  });
});
