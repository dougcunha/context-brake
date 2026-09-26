import { spawn } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { calculateNearestRankP95 } from '../../src/infrastructure/diagnostics/p95.js';
import { sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';
import { installBuiltStatuslineBridge, runPreviousCommand, runStatuslinePipeline } from '../helpers/built-hook.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';

const CLAUDE_ASSET = resolve('dist/assets/runtime/claude-code-hook.mjs');
const USER_COMMAND = ['-e', 'process.stdin.resume()'];
const BRIDGE_TARGET_MS = 50;
const HOOK_TARGET_MS = 100;
const WARMUP_COUNT = 3;
const SAMPLE_COUNT = 20;
const STATUSLINE_LINES = 200;
const TIMEOUT_MS = 3000;
const FLOW_TIMEOUT_MS = 120_000;
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'bench-statusline', agentId: null };

type Sampler = () => Promise<unknown>;
let root = '';

async function timed(sample: Sampler): Promise<number> {
  const start = performance.now();
  await sample();
  return performance.now() - start;
}
async function samplePair(baseline: Sampler, measured: Sampler): Promise<{ readonly baseline: number; readonly measured: number }> {
  for (let index = 0; index < WARMUP_COUNT; index += 1) {
    await baseline();
    await measured();
  }
  const baselines: number[] = [];
  const measurements: number[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    baselines.push(await timed(baseline));
    measurements.push(await timed(measured));
  }
  const result = { baseline: calculateNearestRankP95(baselines) ?? 0, measured: calculateNearestRankP95(measurements) ?? 0 };
  console.log(`[overhead] baseline p95=${result.baseline.toFixed(1)}ms measured p95=${result.measured.toFixed(1)}ms`);
  return result;
}
function assertBudget(p95: { readonly baseline: number; readonly measured: number }, target: number): void {
  expect(p95.measured).toBeGreaterThan(0);
  if (process.env.CI) expect(p95.measured - p95.baseline).toBeLessThanOrEqual(target);
  else expect(p95.measured).toBeLessThanOrEqual(Math.max(target, p95.baseline * 3 + 150));
}
function runHook(event: string, payload: unknown): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [CLAUDE_ASSET, event], { stdio: ['pipe', 'ignore', 'ignore'], env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')); }, TIMEOUT_MS);
    child.on('close', (code) => { clearTimeout(timer); if (code === 0) resolvePromise(); else reject(new Error(`Exit ${code}`)); });
    child.stdin.end(JSON.stringify(payload));
  });
}
async function seedStatuslineLines(): Promise<void> {
  const path = sessionLedgerPath(root, KEY);
  await mkdir(dirname(path), { recursive: true });
  const line = JSON.stringify({ v: 1, type: 'statusline', at: '2026-09-25T12:00:00.000Z', windowTokens: 1000000, inputTokens: 200000, usedPercentage: 20, model: 'claude-opus-5-5' });
  await appendFile(path, `${Array.from({ length: STATUSLINE_LINES }, () => line).join('\n')}\n`, 'utf8');
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-statusline-overhead-'));
  await writeRuntimeConfig(root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('status line bridge and hook overhead (NFR-01, OBJ-04, DEC-13, TC-20)', () => {
  it('adds at most 50 ms p95 to the user status line command', async () => {
    const bridge = await installBuiltStatuslineBridge(root);
    const payload = await readFile(resolve('tests/fixtures/harnesses/claude-code/statusline.json'), 'utf8');
    const p95 = await samplePair(() => runPreviousCommand(USER_COMMAND, payload), () => runStatuslinePipeline(bridge, { bridgeArgs: ['--pipe'], previousArgs: USER_COMMAND, stdin: payload }));
    assertBudget(p95, BRIDGE_TARGET_MS);
  }, FLOW_TIMEOUT_MS);

  it.each(['PreToolUse', 'PostToolUse'])('keeps %s within 100 ms p95 with 200 statusline lines in the ledger', async (event) => {
    await seedStatuslineLines();
    const payload = { session_id: KEY.sessionId, tool_name: 'Read', tool_input: { file_path: 'src/a.ts' }, tool_response: 'ok' };
    const p95 = await samplePair(() => runPreviousCommand(['-e', ''], ''), () => runHook(event, payload));
    assertBudget(p95, HOOK_TARGET_MS);
  }, FLOW_TIMEOUT_MS);
});
