import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runBuiltCli } from './cli-runner.js';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-smoke-doctor-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('built CLI doctor smoke (prd-13 FR-04, DEC-02, DEC-03, TC-09)', () => {
  it('reports a schema-valid diagnosis with a measured hook overhead', async () => {
    expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);
    const run = await runBuiltCli(['doctor', '--json'], root);
    const report = doctorReportSchema.parse(JSON.parse(run.stdout));
    expect(run.code).toBe(report.exitCode);
    expect(report.findings.filter((finding) => finding.severity === 'error')).toEqual([]);
    const claude = report.integrations.find((integration) => integration.harness === 'claude-code');
    expect(claude?.overhead?.sampleCount).toBeGreaterThan(0);
  });
});
