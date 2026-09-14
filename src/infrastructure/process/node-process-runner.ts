import { spawn, type ChildProcess } from 'node:child_process';
import { basename, dirname } from 'node:path';
import process from 'node:process';
import type { ExecutableResult, ExecutableSearch, ProcessRequest, ProcessResult, ProcessRunner } from '../../core/contracts/processes.js';
import { killProcessTree } from './process-tree.js';

const locatorCommand = process.platform === 'win32' ? 'where.exe' : 'which';

function locatorArgs(name: string): readonly string[] {
  if (process.platform === 'win32' && (name.includes('/') || name.includes('\\'))) {
    return [`${dirname(name)}:${basename(name)}`];
  }
  return [name];
}

function collect(child: ChildProcess, timeoutMilliseconds: number): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    function finish(status: ProcessResult['status'], exitCode: number | null): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ status, exitCode, stdout, stderr });
    }
    const timer = setTimeout(() => {
      timedOut = true;
      void killProcessTree(child).then(() => finish('timed_out', null), () => finish('timed_out', null));
    }, timeoutMilliseconds);
    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on('error', () => { if (!timedOut) finish('failed', null); });
    child.on('close', (exitCode) => { if (!timedOut) finish('completed', exitCode); });
  });
}

function locatedPath(result: ProcessResult): string | null {
  if (result.status !== 'completed' || result.exitCode !== 0) return null;
  const firstLine = result.stdout.split(/\r?\n/).find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? null;
}

export class NodeProcessRunner implements ProcessRunner {
  async discover(request: ExecutableSearch): Promise<readonly ExecutableResult[]> {
    const names = [...new Set(request.names)];
    return Promise.all(names.map((name) => this.find(name, request.timeoutMilliseconds)));
  }

  async run(request: ProcessRequest): Promise<ProcessResult> {
    if (!Number.isFinite(request.timeoutMilliseconds) || request.timeoutMilliseconds <= 0) {
      throw new RangeError('Process timeout must be a positive finite number.');
    }
    const child = spawn(request.executable, [...request.args], {
      detached: process.platform !== 'win32',
      shell: false,
      windowsHide: true,
    });
    return collect(child, request.timeoutMilliseconds);
  }

  private async find(name: string, timeoutMilliseconds: number): Promise<ExecutableResult> {
    const result = await this.run({ executable: locatorCommand, args: locatorArgs(name), timeoutMilliseconds });
    return { name, path: locatedPath(result), timedOut: result.status === 'timed_out' };
  }
}
