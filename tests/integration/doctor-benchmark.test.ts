import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorReport, OverheadMeasurement, OverheadMeasurer } from '../../src/core/contracts/diagnostics.js';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { diagnoseProject } from '../../src/core/services/doctor-service.js';
import { runInit } from '../../src/cli/commands/init.js';
import { buildHarnessContext, collectHarnessSources } from '../../src/cli/detection-collector.js';
import { collectProjectSnapshots } from '../../src/cli/snapshot-helper.js';
import { NodeOverheadMeasurer } from '../../src/infrastructure/diagnostics/overhead-measurer.js';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';
import { NodeManifestStore } from '../../src/infrastructure/storage/manifest-store.js';
import { readPackageVersion } from '../../src/infrastructure/storage/package-metadata.js';
import { ProjectConfigStore } from '../../src/infrastructure/storage/project-config-store.js';

function assertMeasurement(meas: { executionModel: string; sampleCount: number; targetMilliseconds: number; p95Milliseconds: number | null; status: string }, expected: { model: string; count: number; target: number }) {
  expect(meas.executionModel).toBe(expected.model);
  expect(meas.sampleCount).toBe(expected.count);
  expect(meas.targetMilliseconds).toBe(expected.target);
  expect(meas.p95Milliseconds).not.toBeNull();
  expect(['pass', 'fail']).toContain(meas.status);
}

const failingMeasurer: OverheadMeasurer = {
  measure: async (harness: HarnessId): Promise<OverheadMeasurement> => ({ harness, executionModel: 'process', sampleCount: 20, p95Milliseconds: 999, targetMilliseconds: 100, status: 'fail' }),
};

async function initHarness(root: string, harnesses: readonly HarnessId[]): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.opencode'), { recursive: true });
  await runInit({ command: 'init', dryRun: false, yes: true, json: true, harness: [...harnesses], excludeHarness: [], instructionFile: [], createInstructions: true, migrateLegacy: false }, { projectRoot: root });
}

async function buildReport(root: string, measurer: OverheadMeasurer): Promise<DoctorReport> {
  const config = await new ProjectConfigStore(join(root, 'context-brake.config.json')).read();
  const manifest = await new NodeManifestStore(root).load();
  const snapshots = await collectProjectSnapshots(root, config);
  const protocolSnapshot = snapshots.find((s) => s.path === config.instructionFiles.protocolFile)!;
  const gitignoreSnapshot = snapshots.find((s) => s.path === '.gitignore')!;
  const adapters = getAllAdapters();
  const context = buildHarnessContext({ projectRoot: root }, manifest);
  const sources = await collectHarnessSources(adapters, context);
  const packageVersion = await readPackageVersion();
  return diagnoseProject({ projectRoot: root, config, adapters, context, sources, measurer, instructionSnapshots: snapshots.filter((s) => config.instructionFiles.targets.includes(s.path)), protocolSnapshot, gitignoreSnapshot, manifest, allSnapshots: snapshots, packageVersion });
}

async function measureInstalled(tempDir: string): Promise<void> {
  await initHarness(tempDir, ['claude-code', 'opencode']);
  const measurer = new NodeOverheadMeasurer(tempDir);
  const claudeBefore = await readFile(join(tempDir, '.claude/hooks/context-brake.mjs'), 'utf8');
  const openBefore = await readFile(join(tempDir, '.opencode/plugins/context-brake.js'), 'utf8');
  assertMeasurement(await measurer.measure('claude-code'), { model: 'process', count: 20, target: 100 });
  assertMeasurement(await measurer.measure('opencode'), { model: 'in_process', count: 100, target: 15 });
  expect(await readFile(join(tempDir, '.claude/hooks/context-brake.mjs'), 'utf8')).toBe(claudeBefore);
  expect(await readFile(join(tempDir, '.opencode/plugins/context-brake.js'), 'utf8')).toBe(openBefore);
}

async function keepInformational(tempDir: string): Promise<void> {
  await initHarness(tempDir, ['claude-code', 'opencode']);
  const real = await buildReport(tempDir, new NodeOverheadMeasurer(tempDir));
  const forced = await buildReport(tempDir, failingMeasurer);
  expect(real.integrations.some((integration) => integration.overhead !== null)).toBe(true);
  expect(real.findings.some((finding) => finding.scope === 'performance')).toBe(false);
  expect(forced.findings.some((finding) => finding.scope === 'performance')).toBe(false);
  expect(forced.exitCode).toBe(real.exitCode);
}

describe('IT-14: Doctor benchmark exercises installed assets (CA-18)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it14-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('measures overhead for installed process and in-process assets without altering files', async () => measureInstalled(tempDir));
  it('keeps benchmark status informational with no finding and no exit-code effect', async () => keepInformational(tempDir));
});
