import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInit } from '../../src/cli/commands/init.js';
import { NodeOverheadMeasurer } from '../../src/infrastructure/diagnostics/overhead-measurer.js';

function assertMeasurement(meas: { executionModel: string; sampleCount: number; targetMilliseconds: number; p95Milliseconds: number | null; status: string }, expected: { model: string; count: number; target: number }) {
  expect(meas.executionModel).toBe(expected.model);
  expect(meas.sampleCount).toBe(expected.count);
  expect(meas.targetMilliseconds).toBe(expected.target);
  expect(meas.p95Milliseconds).not.toBeNull();
  expect(['pass', 'fail']).toContain(meas.status);
}

describe('IT-14: Doctor benchmark exercises installed assets (CA-18)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it14-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('measures overhead for installed process and in-process assets without altering files', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await mkdir(join(tempDir, '.opencode'), { recursive: true });
    await runInit({ command: 'init', dryRun: false, yes: true, json: true, harness: ['claude-code', 'opencode'], excludeHarness: [], instructionFile: [], createInstructions: true, migrateLegacy: false }, { projectRoot: tempDir });
    const measurer = new NodeOverheadMeasurer(tempDir);
    const claudeBefore = await readFile(join(tempDir, '.claude/hooks/context-brake.mjs'), 'utf8');
    const openBefore = await readFile(join(tempDir, '.opencode/plugins/context-brake.js'), 'utf8');
    const claudeMeas = await measurer.measure('claude-code');
    assertMeasurement(claudeMeas, { model: 'process', count: 20, target: 100 });
    const openMeas = await measurer.measure('opencode');
    assertMeasurement(openMeas, { model: 'in_process', count: 100, target: 15 });
    const claudeAfter = await readFile(join(tempDir, '.claude/hooks/context-brake.mjs'), 'utf8');
    const openAfter = await readFile(join(tempDir, '.opencode/plugins/context-brake.js'), 'utf8');
    expect(claudeAfter).toBe(claudeBefore);
    expect(openAfter).toBe(openBefore);
  });
});
