import { rm, writeFile } from 'node:fs/promises';
import process from 'node:process';
import type { RunLock, RunLockHolder } from '../../core/contracts/run-ports.js';
import { ensureRunnerDirectory, lockPath } from './run-paths.js';
import { parseJsonOrNull, readOptionalFile } from './runner-files.js';

const MAX_ATTEMPTS = 3;

export type PidProbe = (pid: number) => boolean;

export class RunLockContentionError extends Error {
  constructor(path: string) {
    super(`Could not acquire the run lock at ${path}: it was replaced repeatedly by another process.`);
    this.name = 'RunLockContentionError';
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export class NodeRunLock implements RunLock {
  private held: RunLockHolder | null = null;

  constructor(private readonly projectRoot: string, private readonly isAlive: PidProbe = isProcessAlive) {}

  async acquire(holder: RunLockHolder): Promise<RunLockHolder | null> {
    await ensureRunnerDirectory(this.projectRoot);
    const path = lockPath(this.projectRoot);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      if (await createLock(path, holder)) {
        this.held = holder;
        return null;
      }
      const existing = await readHolder(path);
      if (existing === undefined) continue;
      if (existing !== null && this.isAlive(existing.pid)) return existing;
      await rm(path, { force: true });
    }
    throw new RunLockContentionError(path);
  }

  async release(): Promise<void> {
    const held = this.held;
    if (held === null) return;
    this.held = null;
    const path = lockPath(this.projectRoot);
    const current = await readHolder(path);
    if (current?.pid === held.pid && current.runId === held.runId) await rm(path, { force: true });
  }
}

async function createLock(path: string, holder: RunLockHolder): Promise<boolean> {
  try {
    await writeFile(path, `${JSON.stringify({ pid: holder.pid, runId: holder.runId })}\n`, { flag: 'wx' });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

async function readHolder(path: string): Promise<RunLockHolder | null | undefined> {
  const source = await readOptionalFile(path);
  if (source === null) return undefined;
  const value = parseJsonOrNull(source);
  if (!isHolder(value)) return null;
  return { pid: value.pid, runId: value.runId };
}

function isHolder(value: unknown): value is RunLockHolder {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Number.isInteger(candidate['pid']) && (candidate['pid'] as number) > 0 && typeof candidate['runId'] === 'string';
}
