import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BenchmarkFixture } from '../../core/contracts/adapter.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import type { OverheadMeasurement, OverheadMeasurer } from '../../core/contracts/diagnostics.js';
import { getAdapter } from '../harnesses/registry.js';
import { sampleInProcess } from './in-process-sampler.js';
import { calculateNearestRankP95 } from './p95.js';

export { calculateNearestRankP95 } from './p95.js';

const PROCESS_TIMEOUT_MS = 2000;
const PROCESS_WARMUP_COUNT = 3;
const PROCESS_SAMPLE_COUNT = 20;

const ASSET_PATHS: Record<HarnessId, string> = {
  'claude-code': '.claude/hooks/context-brake.mjs',
  'codex-cli': '.codex/hooks/context-brake.mjs',
  'cursor': '.cursor/hooks/context-brake.mjs',
  'github-copilot-cli': '.github/hooks/context-brake.mjs',
  'antigravity-cli': '.agents/hooks/context-brake.mjs',
  'opencode': '.opencode/plugins/context-brake.js',
  'pi': '.pi/extensions/context-brake.js',
  'oh-my-pi': '.omp/extensions/context-brake.js',
};

function runProcessSample(path: string, event: string, payload: string): Promise<number> {
  return new Promise((res, rej) => {
    const start = performance.now();
    const child = spawn(process.execPath, [path, event], { stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { child.kill(); rej(new Error('timeout')); }, PROCESS_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) res(performance.now() - start); else rej(new Error(`Exit ${code}`));
    });
    child.on('error', (err) => { clearTimeout(timer); rej(err); });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

async function measureProcess(path: string, event: string, payload: unknown): Promise<number[]> {
  const json = JSON.stringify(payload);
  for (let index = 0; index < PROCESS_WARMUP_COUNT; index++) await runProcessSample(path, event, json);
  const samples: number[] = [];
  for (let index = 0; index < PROCESS_SAMPLE_COUNT; index++) samples.push(await runProcessSample(path, event, json));
  return samples;
}

function unavailable(fixture: BenchmarkFixture): OverheadMeasurement {
  return { harness: fixture.harness, executionModel: fixture.executionModel, sampleCount: 0, p95Milliseconds: null, targetMilliseconds: fixture.targetMilliseconds, status: 'unavailable' };
}

async function sampleAsset(path: string, fixture: BenchmarkFixture): Promise<number[] | null> {
  if (fixture.executionModel === 'process') return measureProcess(path, fixture.event, fixture.samplePayload);
  return sampleInProcess({ assetPath: path, event: fixture.event, payload: fixture.samplePayload });
}

function toMeasurement(harness: HarnessId, fixture: BenchmarkFixture, samples: number[]): OverheadMeasurement {
  const p95Milliseconds = calculateNearestRankP95(samples);
  const status = p95Milliseconds === null ? 'unavailable' : p95Milliseconds <= fixture.targetMilliseconds ? 'pass' : 'fail';
  return { harness, executionModel: fixture.executionModel, sampleCount: samples.length, p95Milliseconds, targetMilliseconds: fixture.targetMilliseconds, status };
}

export class NodeOverheadMeasurer implements OverheadMeasurer {
  constructor(private readonly projectRoot: string) {}

  async measure(harness: HarnessId): Promise<OverheadMeasurement> {
    const fixture = getAdapter(harness).benchmarkFixture();
    const fullPath = resolve(this.projectRoot, ASSET_PATHS[harness]);
    const exists = await stat(fullPath).then((stats) => stats.isFile()).catch(() => false);
    if (!exists) return unavailable(fixture);
    try {
      const samples = await sampleAsset(fullPath, fixture);
      return samples === null ? unavailable(fixture) : toMeasurement(harness, fixture, samples);
    } catch {
      return unavailable(fixture);
    }
  }
}
