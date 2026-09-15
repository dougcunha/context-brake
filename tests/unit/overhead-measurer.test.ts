import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeOverheadMeasurer } from '../../src/infrastructure/diagnostics/overhead-measurer.js';

const FIXTURES = fileURLToPath(new URL('../fixtures/benchmark/', import.meta.url));

let root: string;

async function installFixture(relativePath: string, fixture: string): Promise<void> {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await readFile(join(FIXTURES, fixture), 'utf8'), 'utf8');
}

function expectUnavailable(measurement: { status: string; sampleCount: number; p95Milliseconds: number | null }): void {
  expect(measurement.status).toBe('unavailable');
  expect(measurement.sampleCount).toBe(0);
  expect(measurement.p95Milliseconds).toBeNull();
}

async function sampleClaude(): Promise<void> {
  await installFixture('.claude/hooks/context-brake.mjs', 'process-guard.mjs');
  const measurement = await new NodeOverheadMeasurer(root).measure('claude-code');
  expect(measurement.sampleCount).toBe(20);
  expect(measurement.p95Milliseconds).not.toBeNull();
  expect(measurement.targetMilliseconds).toBe(100);
  expect(['pass', 'fail']).toContain(measurement.status);
}

async function sampleWrongEvent(): Promise<void> {
  await installFixture('.agents/hooks/context-brake.mjs', 'process-guard.mjs');
  expectUnavailable(await new NodeOverheadMeasurer(root).measure('antigravity-cli'));
}

async function sampleMissingAsset(): Promise<void> {
  expectUnavailable(await new NodeOverheadMeasurer(root).measure('cursor'));
}

async function sampleTimeout(): Promise<void> {
  await installFixture('.claude/hooks/context-brake.mjs', 'process-hang.mjs');
  expectUnavailable(await new NodeOverheadMeasurer(root).measure('claude-code'));
}

async function sampleInProcessFailures(): Promise<void> {
  await installFixture('.opencode/plugins/context-brake.js', 'in-process-missing.mjs');
  expectUnavailable(await new NodeOverheadMeasurer(root).measure('opencode'));
  await installFixture('.opencode/plugins/context-brake.js', 'in-process-throwing.mjs');
  expectUnavailable(await new NodeOverheadMeasurer(root).measure('opencode'));
}

describe('TC-04: process sampling forwards the registered event (FR-05, CA-18)', () => {
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-bench-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('produces 20 samples only when the installed event is forwarded', sampleClaude);
  it('reports unavailable when the process rejects the forwarded event', sampleWrongEvent);
  it('reports unavailable when the installed asset is absent', sampleMissingAsset);
  it('reports unavailable when the process exceeds the two second bound', sampleTimeout);
  it('reports unavailable when the named in-process handler is missing or throws', sampleInProcessFailures);
});
