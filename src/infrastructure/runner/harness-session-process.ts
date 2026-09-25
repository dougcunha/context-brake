import { spawn, type ChildProcess } from 'node:child_process';
import process from 'node:process';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';
import type { HarnessSessionExit, HarnessSessionProcess, HarnessSessionRequest, RunningHarnessSession, SessionStreamEvent } from '../../core/contracts/run-ports.js';
import { resolveSpawnCommand, type CommandPlatform } from '../process/executable-command.js';
import { killProcessTree } from '../process/process-tree.js';
import { interruptGroup, killGroup } from './harness-session-signals.js';

export const STOP_GRACE_MILLISECONDS = 10_000;

export type HarnessProcessOptions = { readonly cwd: string; readonly graceMilliseconds?: number; readonly host?: CommandPlatform };

export class NodeHarnessSessionProcess implements HarnessSessionProcess {
  constructor(private readonly options: HarnessProcessOptions) {}

  start(request: HarnessSessionRequest): RunningHarnessSession {
    return new HarnessSession(request, this.options);
  }
}

class HarnessSession implements RunningHarnessSession {
  readonly exit: Promise<HarnessSessionExit>;
  private child: ChildProcess | null = null;
  private stopping: Promise<void> | null = null;
  private exited = false;
  private unparsedLines = 0;
  private readonly settlement: { resolve?: (exit: HarnessSessionExit) => void } = {};
  private readonly launched: Promise<void>;

  constructor(private readonly request: HarnessSessionRequest, private readonly options: HarnessProcessOptions) {
    this.exit = new Promise((resolve) => { this.settlement.resolve = resolve; });
    this.launched = this.launch().then(undefined, () => this.settle(null, true));
  }

  async stop(): Promise<void> {
    await this.launched;
    const child = this.child;
    if (child !== null && (process.platform !== 'win32' || !this.exited)) this.stopping ??= this.terminate(child);
    await this.stopping;
    await this.exit;
  }

  private async launch(): Promise<void> {
    const { command, environment } = this.request;
    const resolved = await resolveSpawnCommand([command.executable, ...command.args], this.options.host);
    const child = spawn(resolved.executable, [...resolved.args], {
      cwd: this.options.cwd,
      env: { ...process.env, ...environment },
      detached: process.platform !== 'win32',
      windowsHide: true,
      windowsVerbatimArguments: resolved.verbatim,
    });
    this.child = child;
    child.on('error', () => this.settle(null, true));
    child.on('close', (exitCode: number | null) => this.settle(exitCode, false));
    child.stderr.resume();
    child.stdin.on('error', () => undefined);
    child.stdin.end(command.stdin);
    createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', (line: string) => this.receive(line));
  }

  private receive(line: string): void {
    if (line.trim() === '') return;
    const events = this.parse(line);
    if (events === null) this.unparsedLines += 1;
    else for (const event of events) this.request.onEvent(event);
  }

  private parse(line: string): readonly SessionStreamEvent[] | null {
    try {
      return this.request.parseLine(line);
    } catch {
      return null;
    }
  }

  private async terminate(child: ChildProcess): Promise<void> {
    if (process.platform !== 'win32' && child.pid !== undefined) {
      if (!this.exited && interruptGroup(child.pid)) {
        const grace = this.options.graceMilliseconds ?? STOP_GRACE_MILLISECONDS;
        await Promise.race([this.exit, delay(grace, undefined, { ref: false })]);
      }
      killGroup(child.pid, this.exited);
      return;
    }
    await killProcessTree(child).then(undefined, (error: unknown) => { if (!this.exited) throw error; });
  }

  private settle(exitCode: number | null, spawnFailed: boolean): void {
    if (this.exited) return;
    this.exited = true;
    this.settlement.resolve?.({ exitCode, spawnFailed, unparsedLines: this.unparsedLines });
  }
}
