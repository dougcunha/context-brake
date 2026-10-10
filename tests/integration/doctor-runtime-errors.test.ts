import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import type { RuntimeStateReading } from '../../src/core/services/runtime-error-checks.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';
import { NodeRuntimeErrorLog } from '../../src/infrastructure/runtime/node-runtime-logs.js';
import { NodeRuntimeStateReader } from '../../src/infrastructure/runtime/runtime-state-reader.js';

const NOW = '2026-09-15T12:00:00.000Z';
const CLOCK = { now: () => new Date(NOW) };
async function seedErrors(root: string): Promise<void> {
  await new NodeRuntimeErrorLog(root, { now: () => new Date('2026-09-14T11:00:00.000Z') }).append('codex-cli', { event: 'PostToolUse', code: 'UNEXPECTED', detail: 'RuntimeFailure' });
  await new NodeRuntimeErrorLog(root, CLOCK).append('codex-cli', { event: 'PostToolUse', code: 'INVALID_CONFIG', detail: 'InvalidConfigurationError' });
}
function diagnoseAt(root: string, runtimeState: RuntimeStateReading): Promise<DoctorReport> {
  return diagnoseProject({
    projectRoot: root, config: DEFAULT_CONFIG, adapters: [], context: { projectRoot: root },
    sources: { 'claude-code': { project: [{ origin: 'project', kind: 'config', value: '.claude/settings.json' }] } },
    manifest: null, allSnapshots: [], packageVersion: '1.0.0', runtimeState,
  });
}
let tempDir: string;
beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t05-doctor-')); });
afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('doctor runtime errors (RF20, RF21, prd-12 FR-07, FR-09)', () => {
  it('reads no runtime state without a runtime directory, then reports only the errors of the last 24 hours', async () => {
    const reader = new NodeRuntimeStateReader(tempDir, CLOCK);
    expect(await reader.read()).toBeNull();
    await seedErrors(tempDir);
    const report = await diagnoseAt(tempDir, (await reader.read()) ?? { errors: [] });
    expect(report.findings).toEqual([{
      code: 'RUNTIME_ERRORS_RECORDED', severity: 'warning', scope: 'project', harness: null, path: '.context-brake/runtime/errors.jsonl',
      message: 'ContextBrake recorded 1 runtime error in the last 24 hours (codes: INVALID_CONFIG).',
      impact: 'Telemetry can fall back to the last recorded zone until the runtime failure is fixed.',
      remediation: 'Inspect .context-brake/runtime/errors.jsonl and fix the reported failures.',
    }]);
    expect(report.exitCode).toBe(1);
  });
});
