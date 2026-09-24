import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { vi } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import type { ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { RUN_ID_ENVIRONMENT_VARIABLE } from '../../src/core/services/run-context.js';
import { NodeRunStore } from '../../src/infrastructure/runner/node-run-store.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { runRecordAt } from './run-records.js';

export const COMMAND_FIXTURE = resolve('tests', 'fixtures', 'runner', 'validation-command.mjs');
export const SESSION_ID = 'session-wrap';
export const clock = { now: () => new Date('2026-09-23T12:00:00.000Z') };

export type CapturedOutput = { readonly stdout: string[]; readonly stderr: string[] };

export async function createProject(): Promise<string> {
  return realpath(await mkdtemp(join(tmpdir(), 'cb-t06-wrap-')));
}

export async function removeProject(projectRoot: string): Promise<void> {
  delete process.env[RUN_ID_ENVIRONMENT_VARIABLE];
  vi.restoreAllMocks();
  await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

export async function startRunnerSession(projectRoot: string, harness: HarnessId): Promise<void> {
  const record = { ...runRecordAt('run-wrap', '2026-09-23T12:00:00.000Z'), harness, activeSession: { harness, sessionId: SESSION_ID, agentId: null } };
  await new NodeRunStore({ projectRoot, stateFiles: { plan: join(projectRoot, 'task_plan.json'), checkpoint: join(projectRoot, 'state_checkpoint.json') } }).writeRecord(record);
  process.env[RUN_ID_ENVIRONMENT_VARIABLE] = 'run-wrap';
}

export async function seedToolLine(projectRoot: string, harness: HarnessId, input: ToolLineInput): Promise<NodeSessionLedger> {
  const ledger = new NodeSessionLedger(projectRoot, clock);
  await ledger.appendToolLine({ harness, sessionId: SESSION_ID, agentId: null }, input);
  return ledger;
}

export function captureOutput(): CapturedOutput {
  const output: CapturedOutput = { stdout: [], stderr: [] };
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { output.stdout.push(String(chunk)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { output.stderr.push(String(chunk)); return true; });
  return output;
}

export async function makeSubdirectory(projectRoot: string): Promise<string> {
  const subdirectory = join(projectRoot, 'packages', 'app');
  await mkdir(subdirectory, { recursive: true });
  return subdirectory;
}
