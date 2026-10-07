import { spawn } from 'node:child_process';
import { describeFailure, SampleError, type SampleFailure } from './sample-failure.js';

const PROCESS_TIMEOUT_MS = 2000;
const PROCESS_WARMUP_COUNT = 3;
const PROCESS_SAMPLE_COUNT = 20;
const SAMPLE_ATTEMPT_LIMIT = 3;
const PROJECT_DIRECTORY_VARIABLES = ['CLAUDE_PROJECT_DIR', 'CURSOR_PROJECT_DIR'] as const;

export type ProcessBenchmark = { readonly path: string; readonly event: string; readonly payload: unknown; readonly projectRoot: string };
type ProcessSample = Omit<ProcessBenchmark, 'payload'> & { readonly payload: string };

function sampleEnvironment(projectRoot: string): NodeJS.ProcessEnv {
  return { ...process.env, ...Object.fromEntries(PROJECT_DIRECTORY_VARIABLES.map((name) => [name, projectRoot])) };
}

function runProcessSample(sample: ProcessSample): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(process.execPath, [sample.path, sample.event], { cwd: sample.projectRoot, env: sampleEnvironment(sample.projectRoot), stdio: ['pipe', 'pipe', 'pipe'] });
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
    child.stdin.write(sample.payload);
    child.stdin.end();
  });
}

async function warmupSamples(sample: ProcessSample): Promise<void> {
  let successCount = 0;
  let lastFailure: SampleFailure | null = null;
  for (let index = 0; index < PROCESS_WARMUP_COUNT; index += 1) {
    try {
      await runProcessSample(sample);
      successCount += 1;
    } catch (error) {
      lastFailure = describeFailure(error, 'spawn_error');
    }
  }
  if (successCount === 0 && lastFailure !== null) throw new SampleError(lastFailure);
}

async function sampleWithRetries(sample: ProcessSample): Promise<number> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await runProcessSample(sample);
    } catch (error) {
      if (attempt >= SAMPLE_ATTEMPT_LIMIT) throw error;
    }
  }
}

export async function measureProcessSamples(benchmark: ProcessBenchmark): Promise<number[]> {
  const sample: ProcessSample = { ...benchmark, payload: JSON.stringify(benchmark.payload) };
  await warmupSamples(sample);
  const samples: number[] = [];
  for (let index = 0; index < PROCESS_SAMPLE_COUNT; index += 1) {
    samples.push(await sampleWithRetries(sample));
  }
  return samples;
}
