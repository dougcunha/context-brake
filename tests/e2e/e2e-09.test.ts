import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';

const MAX_CORE_COMMAND_MS = 5000;
const MAX_USER_WORKFLOW_MS = 120000;

async function createTestDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-09-'));
  await mkdir(join(tempDir, '.claude'), { recursive: true });
  await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(tempDir, 'CLAUDE.md'), '# Claude Instructions\n', 'utf8');
  return tempDir;
}

async function testQuickStartWorkflow(tempDir: string): Promise<void> {
  const startTime = performance.now();
  const initResult = await runBuiltCli(['init', '--yes'], tempDir);
  expect(initResult.code).toBe(0);
  expect(performance.now() - startTime).toBeLessThan(MAX_CORE_COMMAND_MS);

  const doctorResult = await runBuiltCli(['doctor', '--json'], tempDir);
  expect(doctorResult.code).toBe(1);
  expect(performance.now() - startTime).toBeLessThan(MAX_USER_WORKFLOW_MS);

  const report = doctorReportSchema.parse(JSON.parse(doctorResult.stdout));
  expect(report.command).toBe('doctor');
  expect(report.status).toBe('warnings');
  expect(report.exitCode).toBe(1);
  expect(report.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  expect(report.findings.some((f) => f.code === 'VERSION_FLOOR_UNVERIFIED' && f.severity === 'warning')).toBe(true);
  expect(report.integrations[0]?.state).toBe('installed');

  const textResult = await runBuiltCli(['doctor'], tempDir);
  expect(textResult.code).toBe(1);
  expect(textResult.stdout).toContain('[WARN] VERSION_FLOOR_UNVERIFIED');
  expect(performance.now() - startTime).toBeLessThan(MAX_USER_WORKFLOW_MS);
}

async function testDryRunSpeed(tempDir: string): Promise<void> {
  const start = performance.now();
  const result = await runBuiltCli(['init', '--dry-run'], tempDir);
  expect(result.code).toBe(0);
  expect(performance.now() - start).toBeLessThan(MAX_CORE_COMMAND_MS);
  expect(result.stdout).toContain('(dry_run)');
}

describe('E2E-09: Quick-start workflow meets user-time target (CA-19)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await createTestDir(); });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('completes quick-start workflow under two minutes with error-free diagnosis', async () => {
    await testQuickStartWorkflow(tempDir);
  });

  it('executes core dry-run inspection under five seconds', async () => {
    await testDryRunSpeed(tempDir);
  });
});
