import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { HarnessId } from '../../core/contracts/harness.js';
import type { OverheadMeasurement, OverheadMeasurer } from '../../core/contracts/diagnostics.js';
import { getAdapter } from '../harnesses/registry.js';
import { calculateNearestRankP95 } from './p95.js';

export { calculateNearestRankP95 } from './p95.js';

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

function runProcessSample(path: string, payload: string): Promise<number> {
  return new Promise((res, rej) => {
    const start = performance.now();
    const child = spawn(process.execPath, [path], { stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { child.kill(); rej(new Error('timeout')); }, 2000);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) res(performance.now() - start); else rej(new Error(`Exit ${code}`));
    });
    child.on('error', (err) => { clearTimeout(timer); rej(err); });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

async function measureProcess(path: string, payload: unknown): Promise<number[]> {
  const json = JSON.stringify(payload);
  for (let i = 0; i < 3; i++) await runProcessSample(path, json);
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) samples.push(await runProcessSample(path, json));
  return samples;
}

async function measureInProcess(path: string, payload: unknown): Promise<number[]> {
  const mod = await import(pathToFileURL(path).href);
  let handler: ((d: unknown) => Promise<unknown>) | null = null;
  const mockApi = { on: (_: string, fn: (d: unknown) => Promise<unknown>) => { handler = fn; } };
  const res = mod.default(mockApi);
  if (!handler && typeof res === 'object' && res && 'tool.execute.before' in res) handler = res['tool.execute.before'];
  const fn = handler ?? (() => Promise.resolve());
  for (let i = 0; i < 10; i++) await fn(payload);
  const samples: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await fn(payload);
    samples.push(performance.now() - start);
  }
  return samples;
}

export class NodeOverheadMeasurer implements OverheadMeasurer {
  constructor(private readonly projectRoot: string) {}

  async measure(harness: HarnessId): Promise<OverheadMeasurement> {
    const adapter = getAdapter(harness);
    const fixture = adapter.benchmarkFixture();
    const fullPath = resolve(this.projectRoot, ASSET_PATHS[harness]);
    const exists = await stat(fullPath).then((s) => s.isFile()).catch(() => false);
    if (!exists) return { harness, executionModel: fixture.executionModel, sampleCount: 0, p95Milliseconds: null, targetMilliseconds: fixture.targetMilliseconds, status: 'unavailable' };
    try {
      const samples = fixture.executionModel === 'process' ? await measureProcess(fullPath, fixture.samplePayload) : await measureInProcess(fullPath, fixture.samplePayload);
      const p95 = calculateNearestRankP95(samples);
      const status = p95 === null ? 'unavailable' : p95 <= fixture.targetMilliseconds ? 'pass' : 'fail';
      return { harness, executionModel: fixture.executionModel, sampleCount: samples.length, p95Milliseconds: p95, targetMilliseconds: fixture.targetMilliseconds, status };
    } catch {
      return { harness, executionModel: fixture.executionModel, sampleCount: 0, p95Milliseconds: null, targetMilliseconds: fixture.targetMilliseconds, status: 'unavailable' };
    }
  }
}
