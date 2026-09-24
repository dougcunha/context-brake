import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { ExecutableSearch, ProcessRunner } from '../../src/core/contracts/processes.js';
import { ClaudeSessionLauncher } from '../../src/infrastructure/harnesses/claude-code/session-launcher.js';
import { composeRunSettings, prepareHarness } from '../../src/infrastructure/runner/runner-composition.js';
import { newRunId, nodeHasher, nodeTimer, ResolvedExecutableLauncher, RuntimeBootTokenEstimator } from '../../src/infrastructure/runner/run-system-ports.js';
import { isSafeRunId } from '../../src/infrastructure/runner/run-paths.js';
import { checkpointAt, planWithStatuses } from '../helpers/run-plans.js';

const clock = { now: () => new Date('2026-09-24T12:00:00.000Z') };

function discovering(found: string | null): ProcessRunner {
  return {
    discover: async (search: ExecutableSearch) => search.names.map((name) => ({ name, path: found, timedOut: false })),
    run: async () => ({ status: 'failed', exitCode: null, stdout: '', stderr: '' }),
  };
}

let projectRoot: string;
beforeEach(async () => { projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'cb-t08-ports-'))); });
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('runner system ports (CMP-19)', () => {
  it('hashes with sha256, waits, and builds safe unique run ids', async () => {
    expect(nodeHasher.sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    await expect(nodeTimer.wait(1)).resolves.toBeUndefined();
    const first = newRunId(clock.now());
    expect(first).toMatch(/^run-2026-09-24T12-00-00-000Z-[0-9a-f]{6}$/);
    expect(isSafeRunId(first)).toBe(true);
    expect(newRunId(clock.now())).not.toBe(first);
  });

  it('estimates boot tokens from the rendered boot, and zero without a plan (DEC-03, RF17)', async () => {
    const estimator = new RuntimeBootTokenEstimator({ projectRoot, config: DEFAULT_CONFIG, clock, harness: 'claude-code' });
    expect(await estimator.estimate()).toBe(0);
    await writeFile(join(projectRoot, 'task_plan.json'), JSON.stringify(planWithStatuses(['PENDING'])), 'utf8');
    await writeFile(join(projectRoot, 'state_checkpoint.json'), JSON.stringify(checkpointAt('2026-09-24T00:00:00.000Z')), 'utf8');
    expect(await estimator.estimate()).toBeGreaterThan(0);
  });

  it('replaces the logical executable with the resolved one and keeps parsing', () => {
    const launcher = new ResolvedExecutableLauncher(new ClaudeSessionLauncher(), 'claude-resolved');
    expect(launcher.harness).toBe('claude-code');
    expect(launcher.buildCommand({ prompt: 'p', harnessArgs: ['--x'] })).toMatchObject({ executable: 'claude-resolved', args: ['-p', '--output-format', 'stream-json', '--verbose', '--x'], stdin: 'p' });
    expect(launcher.parseLine('{"type":"system","subtype":"init","session_id":"s1"}')).toEqual([{ kind: 'started', sessionId: 's1' }]);
  });

  it('takes prompt file names from the configuration', () => {
    const settings = composeRunSettings({ runId: 'run-1', config: DEFAULT_CONFIG, limits: DEFAULT_CONFIG.runner, harnessArgs: ['--x'] });
    expect(settings.files).toEqual({ planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', protocolFile: 'docs/context-brake-protocol.md' });
  });
});

describe('prepareHarness (DEC-02, DEC-04, DEC-21)', () => {
  it('reports an unsupported harness with its reason without discovery', async () => {
    expect(await prepareHarness({ harness: 'pi', harnessArgs: [], processes: discovering(null) })).toMatchObject({ kind: 'unsupported', reason: expect.stringContaining('Pi skips project extensions') });
  });

  it('reports a missing executable with the names it looked for', async () => {
    expect(await prepareHarness({ harness: 'codex-cli', harnessArgs: [], processes: discovering(null) })).toEqual({ kind: 'missing', executableNames: ['codex'] });
  });

  it('returns a launcher bound to the discovered executable', async () => {
    const preparation = await prepareHarness({ harness: 'claude-code', harnessArgs: ['--model', 'x'], processes: discovering('/bin/claude') });
    expect(preparation.kind).toBe('ready');
    expect(preparation.kind === 'ready' ? preparation.launcher.buildCommand({ prompt: '', harnessArgs: [] }).executable : '').toBe('claude');
  });
});
