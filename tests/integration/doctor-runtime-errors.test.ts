import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import type { RuntimeStateReading } from '../../src/core/services/runtime-error-checks.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';
import { renderJsonOutput } from '../../src/cli/output/json.js';
import { renderDoctorText } from '../../src/cli/output/text.js';
import { NodeRuntimeErrorLog } from '../../src/infrastructure/runtime/node-runtime-logs.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { NodeRuntimeStateReader } from '../../src/infrastructure/runtime/runtime-state-reader.js';

const NOW = '2026-09-15T12:00:00.000Z';
const RUNTIME_CODES: readonly string[] = ['BRAKE_COOPERATIVE', 'BRAKE_BLOCKS_RECORDED', 'RUNTIME_ERRORS_RECORDED'];
const REMOVED_CODES: readonly string[] = ['BRAKE_COOPERATIVE', 'BRAKE_BLOCKS_RECORDED'];
async function seedRuntime(root: string, now: { value: string }) {
  const clock = { now: () => new Date(now.value) };
  const ledger = new NodeSessionLedger(root, clock);
  await ledger.appendSessionLine({ harness: 'codex-cli', sessionId: 'codex-a', agentId: null });
  const errors = new NodeRuntimeErrorLog(root, clock);
  now.value = '2026-09-14T11:00:00.000Z';
  await errors.append('codex-cli', { event: 'PostToolUse', code: 'UNEXPECTED', detail: 'RuntimeFailure' });
  now.value = NOW;
  await errors.append('codex-cli', { event: 'PostToolUse', code: 'INVALID_CONFIG', detail: 'InvalidConfigurationError' });
  return clock;
}
function diagnoseAt(root: string, runtimeState?: RuntimeStateReading) {
  return diagnoseProject({
    projectRoot: root, config: DEFAULT_CONFIG, adapters: [], context: { projectRoot: root },
    sources: { 'claude-code': { project: [{ origin: 'project', kind: 'config', value: '.claude/settings.json' }] } },
    manifest: null, allSnapshots: [], packageVersion: '1.0.0',
    ...(runtimeState ? { runtimeState } : {}),
  });
}
function captureStdout(render: () => void): string {
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  render();
  const output = spy.mock.calls.map((call) => String(call[0])).join('');
  spy.mockRestore();
  return output;
}
let tempDir: string;
beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t05-doctor-')); });
afterEach(async () => {
  vi.restoreAllMocks();
  await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('doctor runtime errors (RF20, prd-12 FR-07, FR-09)', () => {
  it('reports recent errors and no brake findings, with text and JSON parity', async () => {
    const runtimeState = await new NodeRuntimeStateReader(tempDir, await seedRuntime(tempDir, { value: NOW })).read();
    expect(runtimeState).not.toBeNull();
    const report = await diagnoseAt(tempDir, runtimeState ?? undefined);
    expect(report.findings.filter((f) => REMOVED_CODES.includes(f.code))).toEqual([]);
    const errors = report.findings.find((f) => f.code === 'RUNTIME_ERRORS_RECORDED');
    expect(errors).toMatchObject({ severity: 'warning', scope: 'project', path: '.context-brake/runtime/errors.jsonl' });
    expect(errors?.message).toMatch(/1 runtime error .*INVALID_CONFIG/);
    expect(errors?.message).not.toContain('UNEXPECTED');
    expect(report.exitCode).toBe(1);
    const text = captureStdout(() => renderDoctorText(report));
    const parsed = doctorReportSchema.parse(JSON.parse(captureStdout(() => renderJsonOutput(report))));
    for (const finding of report.findings) expect(text).toContain(`${finding.code}: ${finding.message}`);
    expect(parsed.findings).toEqual(report.findings);
  });
});
describe('doctor without runtime state (RF20, RF21)', () => {
  it('emits none of the runtime findings without a runtime directory', async () => {
    expect(await new NodeRuntimeStateReader(tempDir, { now: () => new Date(NOW) }).read()).toBeNull();
    const report = await diagnoseAt(tempDir);
    expect(report.findings.filter((f) => RUNTIME_CODES.includes(f.code))).toEqual([]);
    expect(report.status).toBe('healthy');
    expect(report.exitCode).toBe(0);
  });
});
