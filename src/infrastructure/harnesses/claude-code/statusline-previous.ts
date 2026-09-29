import type { ChildProcess } from 'node:child_process';
import { spawnPipedProcess } from '../../process/node-process-runner.js';
import { killProcessTree } from '../../process/process-tree.js';
import type { ShellInvocation } from './statusline-shell.js';

export const PREVIOUS_STATUSLINE_TIMEOUT_MILLISECONDS = 5000;
export const PREVIOUS_STATUSLINE_OUTPUT_LIMIT_BYTES = 1024 * 1024;

export type PreviousFailure = 'not started' | 'timed out' | 'no output' | `exit ${number}`;
export type PreviousResult = { readonly kind: 'output'; readonly stdout: Buffer } | { readonly kind: 'failed'; readonly reason: PreviousFailure };
export type PreviousRun = { readonly shell: ShellInvocation; readonly stdin: Buffer; readonly timeoutMilliseconds?: number | undefined };

export async function runPreviousStatusline(run: PreviousRun): Promise<PreviousResult> {
  for (const executable of run.shell.executables) {
    const result = await runWith(executable, run);
    if (result !== null) return result;
  }
  return { kind: 'failed', reason: 'not started' };
}

function runWith(executable: string, run: PreviousRun): Promise<PreviousResult | null> {
  const child = spawnPipedProcess(executable, run.shell.args);
  child.stdin?.on('error', () => undefined);
  child.stdin?.end(run.stdin);
  return collect(child, run.timeoutMilliseconds ?? PREVIOUS_STATUSLINE_TIMEOUT_MILLISECONDS);
}

function collect(child: ChildProcess, timeoutMilliseconds: number): Promise<PreviousResult | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let isTimedOut = false;
    const timer = setTimeout(() => { isTimedOut = true; resolve({ kind: 'failed', reason: 'timed out' }); void killProcessTree(child).catch(() => undefined); }, timeoutMilliseconds);
    child.stdout?.on('data', (chunk: Buffer) => {
      if (size < PREVIOUS_STATUSLINE_OUTPUT_LIMIT_BYTES) chunks.push(chunk.subarray(0, PREVIOUS_STATUSLINE_OUTPUT_LIMIT_BYTES - size));
      size += chunk.length;
    });
    child.on('error', () => { clearTimeout(timer); resolve(null); });
    child.on('close', (code) => { clearTimeout(timer); if (!isTimedOut) resolve(classify(code, Buffer.concat(chunks))); });
  });
}

function classify(code: number | null, stdout: Buffer): PreviousResult {
  if (code !== 0) return { kind: 'failed', reason: `exit ${code ?? -1}` };
  if (stdout.toString('utf8').trim() === '') return { kind: 'failed', reason: 'no output' };
  return { kind: 'output', stdout };
}
