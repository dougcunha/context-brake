import { copyFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { BenchmarkFixture } from '../../core/contracts/adapter.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import type { OverheadMeasurement, OverheadMeasurer } from '../../core/contracts/diagnostics.js';
import { getAdapter } from '../harnesses/registry.js';
import { sampleInProcess } from './in-process-sampler.js';
import { calculateNearestRankP95 } from './p95.js';
import { measureProcessSamples } from './process-sampler.js';
import { describeFailure, type SampleFailure } from './sample-failure.js';

export { calculateNearestRankP95 } from './p95.js';
export type { SampleFailure } from './sample-failure.js';

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

function unavailable(fixture: BenchmarkFixture): OverheadMeasurement {
  return { harness: fixture.harness, executionModel: fixture.executionModel, sampleCount: 0, p95Milliseconds: null, targetMilliseconds: fixture.targetMilliseconds, status: 'unavailable' };
}

const SANDBOX_PREFIX = 'context-brake-benchmark-';
type Sandbox = { readonly root: string; readonly assetPath: string };

async function createSandbox(sourcePath: string, relativeAssetPath: string): Promise<Sandbox> {
  const root = await mkdtemp(join(tmpdir(), SANDBOX_PREFIX));
  const assetPath = join(root, relativeAssetPath);
  await mkdir(dirname(assetPath), { recursive: true });
  await copyFile(sourcePath, assetPath);
  return { root, assetPath };
}
async function sampleAsset(sandbox: Sandbox, fixture: BenchmarkFixture): Promise<number[] | null> {
  const benchmark = { event: fixture.event, payload: fixture.samplePayload, projectRoot: sandbox.root };
  if (fixture.executionModel === 'process') return measureProcessSamples({ ...benchmark, path: sandbox.assetPath });
  return sampleInProcess({ ...benchmark, assetPath: sandbox.assetPath });
}

function toMeasurement(harness: HarnessId, fixture: BenchmarkFixture, samples: number[]): OverheadMeasurement {
  const p95Milliseconds = calculateNearestRankP95(samples);
  const status = p95Milliseconds === null ? 'unavailable' : p95Milliseconds <= fixture.targetMilliseconds ? 'pass' : 'fail';
  return { harness, executionModel: fixture.executionModel, sampleCount: samples.length, p95Milliseconds, targetMilliseconds: fixture.targetMilliseconds, status };
}

export class NodeOverheadMeasurer implements OverheadMeasurer {
  private failure: SampleFailure | null = null;
  constructor(private readonly projectRoot: string) {}
  get lastFailure(): SampleFailure | null {
    return this.failure;
  }
  async measure(harness: HarnessId): Promise<OverheadMeasurement> {
    this.failure = null;
    const fixture = getAdapter(harness).benchmarkFixture();
    const fullPath = resolve(this.projectRoot, ASSET_PATHS[harness]);
    const exists = await stat(fullPath).then((stats) => stats.isFile()).catch(() => false);
    if (!exists) {
      this.failure = { cause: 'asset_missing', detail: ASSET_PATHS[harness] };
      return unavailable(fixture);
    }
    const sandbox = await createSandbox(fullPath, ASSET_PATHS[harness]);
    try {
      const samples = await sampleAsset(sandbox, fixture);
      if (samples === null) {
        this.failure = { cause: 'handler_missing', detail: fixture.event };
        return unavailable(fixture);
      }
      return toMeasurement(harness, fixture, samples);
    } catch (error) {
      this.failure = describeFailure(error, 'handler_error');
      return unavailable(fixture);
    } finally {
      await rm(sandbox.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }
}
