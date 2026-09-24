import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { StateFile } from '../../core/contracts/run-ports.js';
import { ensureRuntimeDirectory, runtimeDirectory } from '../runtime/runtime-paths.js';

export const RUNNER_DIR_NAME = 'runner';
export const RUNS_DIR_NAME = 'runs';
export const RUN_RECORD_FILE = 'run.json';
export const SESSIONS_LOG_FILE = 'sessions.jsonl';
export const APPROVALS_FILE = 'approvals.json';
export const LOCK_FILE = 'run.lock';

const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function runnerDirectory(projectRoot: string): string {
  return join(runtimeDirectory(projectRoot), RUNNER_DIR_NAME);
}
export function runsDirectory(projectRoot: string): string {
  return join(runnerDirectory(projectRoot), RUNS_DIR_NAME);
}
export function isSafeRunId(runId: string): boolean {
  return SAFE_RUN_ID.test(runId);
}
export function runDirectory(projectRoot: string, runId: string): string {
  if (!isSafeRunId(runId)) throw new RangeError(`Run id is not a safe directory name: ${JSON.stringify(runId)}`);
  return join(runsDirectory(projectRoot), runId);
}
export function snapshotFileName(file: StateFile): string {
  return `${file}.snapshot.json`;
}
export function invalidCopyFileName(file: string, at: Date): string {
  return `${file}.invalid-${at.toISOString().replace(/[:.]/g, '-')}.json`;
}
export function approvalsPath(projectRoot: string): string {
  return join(runnerDirectory(projectRoot), APPROVALS_FILE);
}
export function lockPath(projectRoot: string): string {
  return join(runnerDirectory(projectRoot), LOCK_FILE);
}
export async function ensureRunnerDirectory(projectRoot: string): Promise<void> {
  await ensureRuntimeDirectory(projectRoot);
  await mkdir(runsDirectory(projectRoot), { recursive: true });
}
