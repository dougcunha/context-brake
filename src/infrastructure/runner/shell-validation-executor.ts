import { spawn, type ChildProcess } from 'node:child_process';
import process from 'node:process';
import type { RunningValidation, ValidationExecutor, ValidationOutcome, ValidationRequest } from '../../core/contracts/run-ports.js';
import { killProcessTree } from '../process/process-tree.js';

export const OUTPUT_TAIL_BYTES = 16 * 1024;
const MAX_UTF8_CONTINUATION_BYTES = 3;

export function appendTail(tail: Buffer, chunk: Buffer, limit: number = OUTPUT_TAIL_BYTES): Buffer {
  const combined = Buffer.concat([tail, chunk]);
  return combined.length <= limit ? combined : combined.subarray(combined.length - limit);
}

export function decodeTail(tail: Buffer): string {
  let start = 0;
  while (start < MAX_UTF8_CONTINUATION_BYTES && start < tail.length && ((tail[start] ?? 0) & 0xc0) === 0x80) start += 1;
  return tail.subarray(start).toString('utf8');
}

export class ShellValidationExecutor implements ValidationExecutor {
  constructor(private readonly projectRoot: string) {}

  start(request: ValidationRequest): RunningValidation {
    if (!Number.isFinite(request.timeoutMilliseconds) || request.timeoutMilliseconds <= 0) {
      throw new RangeError('Validation timeout must be a positive finite number.');
    }
    const child = spawn(request.command, {
      cwd: this.projectRoot,
      shell: true,
      detached: process.platform !== 'win32',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return new ValidationRun(child, request.timeoutMilliseconds);
  }
}

class ValidationRun implements RunningValidation {
  readonly outcome: Promise<ValidationOutcome>;
  private tail: Buffer = Buffer.alloc(0);
  private killing: Promise<void> | null = null;
  private settled = false;
  private readonly startedAt = performance.now();
  private readonly settlement: { resolve?: (outcome: ValidationOutcome) => void } = {};
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly child: ChildProcess, timeoutMilliseconds: number) {
    this.outcome = new Promise((resolve) => { this.settlement.resolve = resolve; });
    this.timer = setTimeout(() => this.expire(), timeoutMilliseconds);
    child.stdout?.on('data', (chunk: Buffer) => { this.tail = appendTail(this.tail, chunk); });
    child.stderr?.on('data', (chunk: Buffer) => { this.tail = appendTail(this.tail, chunk); });
    child.on('error', () => this.exit(null));
    child.on('close', (exitCode: number | null) => this.exit(exitCode));
  }

  async stop(): Promise<void> {
    if (this.settled) return;
    await this.terminate();
    this.settle('failed', null);
  }

  private expire(): void {
    void this.terminate().then(() => this.settle('timed_out', null), () => this.settle('timed_out', null));
  }

  private exit(exitCode: number | null): void {
    if (this.killing !== null) return;
    this.settle(exitCode === 0 ? 'passed' : 'failed', exitCode);
  }

  private settle(status: ValidationOutcome['status'], exitCode: number | null): void {
    clearTimeout(this.timer);
    this.settled = true;
    this.settlement.resolve?.({ status, exitCode, durationMs: Math.round(performance.now() - this.startedAt), outputTail: decodeTail(this.tail) });
  }

  private terminate(): Promise<void> {
    this.killing ??= killProcessTree(this.child);
    return this.killing;
  }
}
