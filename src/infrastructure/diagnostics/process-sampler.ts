import { spawn } from 'node:child_process';
import { describeFailure, SampleError, type SampleFailure } from './sample-failure.js';

const PROCESS_TIMEOUT_MS = 2000;
const PROCESS_WARMUP_COUNT = 3;
const PROCESS_SAMPLE_COUNT = 20;
const SAMPLE_ATTEMPT_LIMIT = 3;

function runProcessSample(path: string, event: string, payload: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(process.execPath, [path, event], { stdio: ['pipe', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      child.kill();
      reject(new SampleError({ cause: 'timeout', detail: `${PROCESS_TIMEOUT_MS}ms` }));
    }, PROCESS_TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(performance.now() - start);
        return;
      }
      reject(new SampleError({ cause: 'nonzero_exit', detail: code === null ? 'terminated' : `exit ${String(code)}` }));
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new SampleError(describeFailure(error, 'spawn_error')));
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

async function warmupSamples(path: string, event: string, payload: string): Promise<void> {
  let successCount = 0;
  let lastFailure: SampleFailure | null = null;
  for (let index = 0; index < PROCESS_WARMUP_COUNT; index += 1) {
    try {
      await runProcessSample(path, event, payload);
      successCount += 1;
    } catch (error) {
      lastFailure = describeFailure(error, 'spawn_error');
    }
  }
  if (successCount === 0 && lastFailure !== null) throw new SampleError(lastFailure);
}

async function sampleWithRetries(path: string, event: string, payload: string): Promise<number> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await runProcessSample(path, event, payload);
    } catch (error) {
      if (attempt >= SAMPLE_ATTEMPT_LIMIT) throw error;
    }
  }
}

export async function measureProcessSamples(path: string, event: string, payload: unknown): Promise<number[]> {
  const json = JSON.stringify(payload);
  await warmupSamples(path, event, json);
  const samples: number[] = [];
  for (let index = 0; index < PROCESS_SAMPLE_COUNT; index += 1) {
    samples.push(await sampleWithRetries(path, event, json));
  }
  return samples;
}
