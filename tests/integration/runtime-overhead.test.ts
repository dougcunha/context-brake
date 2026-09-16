import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateNearestRankP95 } from '../../src/infrastructure/diagnostics/p95.js';
import { sampleInProcess } from '../../src/infrastructure/diagnostics/in-process-sampler.js';
import { seedTurns, writeRuntimeConfig } from '../helpers/runtime-seed.js';

const CLAUDE_ASSET = resolve('dist/assets/runtime/claude-code-hook.mjs');
const PI_ASSET = resolve('dist/assets/runtime/pi-extension.js');
const TIMEOUT_MS = 3000;
const PROCESS_TARGET_MS = 100;
const IN_PROCESS_TARGET_MS = 15;

function runSample(args: string[], input: string, cwd: string): Promise<number> {
  return new Promise((res, rej) => {
    const start = performance.now();
    const child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd, env: { ...process.env, CLAUDE_PROJECT_DIR: cwd } });
    const timer = setTimeout(() => { child.kill(); rej(new Error('timeout')); }, TIMEOUT_MS);
    child.on('close', (code) => { clearTimeout(timer); if (code === 0) res(performance.now() - start); else rej(new Error(`Exit ${code}`)); });
    child.on('error', (err) => { clearTimeout(timer); rej(err); });
    child.stdin.write(input);
    child.stdin.end();
  });
}

async function measureProcess(event: string, payload: unknown, cwd: string): Promise<number> {
  const json = JSON.stringify(payload);
  for (let i = 0; i < 3; i++) await runSample([CLAUDE_ASSET, event], json, cwd);
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) samples.push(await runSample([CLAUDE_ASSET, event], json, cwd));
  return calculateNearestRankP95(samples) ?? 0;
}

async function measureBaseline(): Promise<number> {
  for (let i = 0; i < 3; i++) await runSample(['-e', ''], '', process.cwd());
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) samples.push(await runSample(['-e', ''], '', process.cwd()));
  return calculateNearestRankP95(samples) ?? 0;
}

function assertProcessP95(p95: number, baseline: number): void {
  expect(p95).toBeGreaterThan(0);
  if (process.env.CI) expect(p95).toBeLessThanOrEqual(PROCESS_TARGET_MS);
  else expect(p95).toBeLessThanOrEqual(Math.max(PROCESS_TARGET_MS, baseline * 3 + 150));
}

describe('runtime overhead targets (TC-22, CA-20, DEC-17)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t08-overhead-'));
    await writeRuntimeConfig(root);
    const plan = { currentStepId: 1, steps: [{ id: 1, status: 'IN_PROGRESS', validationCommand: 'npm test' }] };
    await writeFile(join(root, 'task_plan.json'), JSON.stringify(plan), 'utf8');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('measures built post-tool path within overhead limit', async () => {
    const baseline = await measureBaseline();
    const payload = { session_id: 'bench-post', tool_name: 'Write', tool_input: { file_path: 'src/a.ts' }, tool_response: 'ok' };
    const p95 = await measureProcess('PostToolUse', payload, root);
    assertProcessP95(p95, baseline);
  });

  it('measures critical pre-tool path with allowlist evaluation within overhead limit', async () => {
    const baseline = await measureBaseline();
    await seedTurns(root, { harness: 'claude-code', sessionId: 'bench-crit', agentId: null }, 12);
    const payload = { session_id: 'bench-crit', tool_name: 'Bash', tool_input: { command: 'npm test' } };
    const p95 = await measureProcess('PreToolUse', payload, root);
    assertProcessP95(p95, baseline);
  });

  it('measures in-process tool_call handler within 15 ms limit', async () => {
    const samples = await sampleInProcess({ assetPath: PI_ASSET, event: 'tool_call', payload: { toolName: 'read', input: { path: 'src/a.ts' } } });
    const p95 = calculateNearestRankP95(samples ?? []);
    expect(p95).not.toBeNull();
    expect(p95!).toBeLessThanOrEqual(IN_PROCESS_TARGET_MS);
  });
});
