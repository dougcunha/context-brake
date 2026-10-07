import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport, InstallReport } from '../../src/core/contracts/diagnostics.js';
import { runBuiltCli } from './cli-runner.js';

const COPILOT_CONTEXT = 'Context usage is not exposed to GitHub Copilot CLI hooks.';
const CURSOR_CONTEXT = 'Context usage reaches Cursor hooks only before compaction, so ContextBrake estimates it.';

async function setupRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-e2e-support-'));
  await mkdir(join(dir, '.github/copilot'), { recursive: true });
  await mkdir(join(dir, '.cursor'), { recursive: true });
  await writeFile(join(dir, '.github/copilot/settings.json'), '{}\n', 'utf8');
  await writeFile(join(dir, '.cursor/hooks.json'), '{}\n', 'utf8');
  return dir;
}

async function cleanup(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function assertInitParity(dir: string): Promise<void> {
  const applied = await runBuiltCli(['init', '--yes'], dir);
  expect(applied.code).toBe(0);
  expect(applied.stdout).toContain(COPILOT_CONTEXT);
  expect(applied.stdout).toContain(CURSOR_CONTEXT);
  const initJson = await runBuiltCli(['init', '--dry-run', '--json'], dir);
  const report = JSON.parse(initJson.stdout) as InstallReport;
  const copilot = report.plan.harnesses.find((harness) => harness.harness === 'github-copilot-cli');
  const cursor = report.plan.harnesses.find((harness) => harness.harness === 'cursor');
  expect(copilot?.supportLevel).toBe('full');
  expect(copilot?.limitations ?? []).toContainEqual({ capability: 'context_usage', impact: COPILOT_CONTEXT });
  expect(cursor?.supportLevel).toBe('full');
  expect(cursor?.limitations ?? []).toContainEqual({ capability: 'context_usage', impact: CURSOR_CONTEXT });
  expect([copilot, cursor].flatMap((harness) => harness?.limitations ?? []).map((limitation) => limitation.capability)).not.toContain('post_tool_telemetry');
}

async function assertDoctorParity(dir: string): Promise<void> {
  await runBuiltCli(['init', '--yes'], dir);
  const text = await runBuiltCli(['doctor'], dir);
  expect(text.stdout + text.stderr).toContain(COPILOT_CONTEXT);
  expect(text.stdout + text.stderr).toContain(CURSOR_CONTEXT);
  const json = await runBuiltCli(['doctor', '--json'], dir);
  const report = JSON.parse(json.stdout) as DoctorReport;
  const copilot = report.integrations.find((integration) => integration.harness === 'github-copilot-cli');
  const cursor = report.integrations.find((integration) => integration.harness === 'cursor');
  expect(copilot?.support.supportLevel).toBe('full');
  expect(copilot?.support.limitations ?? []).toContainEqual({ capability: 'context_usage', impact: COPILOT_CONTEXT });
  expect(cursor?.support.limitations ?? []).toContainEqual({ capability: 'context_usage', impact: CURSOR_CONTEXT });
  expect(report.findings.some((finding) => finding.code === 'COPILOT_TIMEOUT_LIMITATION')).toBe(false);
}

describe('E2E support limitations: Copilot and Cursor (TC-03, FR-03, FR-04)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await setupRepo(); });
  afterEach(async () => { await cleanup(tempDir); });
  it('prints matching limitations in init text and JSON and exits 0', () => assertInitParity(tempDir));
  it('prints equivalent limitations in doctor text and JSON with no limitation finding', () => assertDoctorParity(tempDir));
});
