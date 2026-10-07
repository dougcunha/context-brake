import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateNearestRankP95 } from '../../src/infrastructure/diagnostics/p95.js';
import { resolveStatuslineShell } from '../../src/infrastructure/harnesses/claude-code/statusline-shell.js';
import { STATUSLINE_STATE_FILE } from '../../src/infrastructure/harnesses/claude-code/statusline-state.js';
import { installBuiltStatuslineBridge } from '../helpers/built-hook.js';

const TARGET_MS = 200;
// A cold PowerShell start on this machine jitters by hundreds of milliseconds under load, so CI carries the limits.
const LOCAL_P95_TARGET_MS = 1000;
const LOCAL_MEDIAN_TARGET_MS = 400;
const WARMUP_COUNT = 3;
const SAMPLE_COUNT = 20;
const FLOW_TIMEOUT_MS = 240_000;
const PREVIOUS = `node -e "process.stdin.resume();process.stdin.on('end',()=>process.stdout.write('ok'))"`;
// One node process plus the resolved shell, so both sides pay the same shell start cost.
const DIRECT_RUNNER = "const{spawn}=require('child_process');const child=spawn(process.argv[1],[...process.argv.slice(2)],{stdio:['pipe','pipe','inherit'],shell:false,windowsHide:true});process.stdin.pipe(child.stdin);child.stdout.pipe(process.stdout);";

let root = '';

function runSpawned(args: readonly string[], stdin: string): Promise<number> {
  return new Promise((resolvePromise) => {
    const start = performance.now();
    const child = spawn(process.execPath, [...args], { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
    child.stdin.on('error', () => undefined);
    child.stdin.end(stdin);
    child.stdout.resume();
    child.on('close', () => resolvePromise(performance.now() - start));
  });
}
function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-statusline-previous-overhead-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('bridge overhead when it runs the previous command (NFR-02, DEC-03, TC-08)', () => {
  it('adds at most 200 ms p95 to running the previous command in the same shell', async () => {
    const bridge = await installBuiltStatuslineBridge(root);
    await mkdir(dirname(join(root, STATUSLINE_STATE_FILE)), { recursive: true });
    await writeFile(join(root, STATUSLINE_STATE_FILE), JSON.stringify({ v: 1, installedCommand: 'node "x"', previousLocal: null, previousSource: 'user', previousCommand: PREVIOUS, createdLocalFile: true }), 'utf8');
    const payload = await readFile(resolve('tests/fixtures/harnesses/claude-code/statusline.json'), 'utf8');
    const shell = await resolveStatuslineShell(PREVIOUS);
    function direct(): Promise<number> { return runSpawned(['-e', DIRECT_RUNNER, shell.executables[0] ?? '', ...shell.args], payload); }
    function bridged(): Promise<number> { return runSpawned([bridge], payload); }
    for (let index = 0; index < WARMUP_COUNT; index += 1) { await direct(); await bridged(); }
    const baseline: number[] = [];
    const measured: number[] = [];
    const deltas: number[] = [];
    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      const alone = await direct();
      const throughBridge = await bridged();
      baseline.push(alone); measured.push(throughBridge); deltas.push(throughBridge - alone);
    }
    const directP95 = calculateNearestRankP95(baseline) ?? 0;
    const bridgedP95 = calculateNearestRankP95(measured) ?? 0;
    console.log(`[overhead] ${shell.label} direct p95=${directP95.toFixed(1)}ms bridged p95=${bridgedP95.toFixed(1)}ms delta p95=${(bridgedP95 - directP95).toFixed(1)}ms median=${median(deltas).toFixed(1)}ms`);
    expect(median(deltas)).toBeLessThanOrEqual(process.env.CI ? TARGET_MS : LOCAL_MEDIAN_TARGET_MS);
    expect(bridgedP95 - directP95).toBeLessThanOrEqual(process.env.CI ? TARGET_MS : LOCAL_P95_TARGET_MS);
  }, FLOW_TIMEOUT_MS);
});
