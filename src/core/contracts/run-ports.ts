import type { HarnessId } from './harness.js';
import type { ActiveSession, ApprovalsFile, RunRecord, RunSessionLine, TokenCount } from './run-records.js';
import type { PlanStep, PlanStepId } from './task-plan.js';
import type { Zone } from './zones.js';

export type SessionStreamEvent =
  | { readonly kind: 'started'; readonly sessionId: string }
  | { readonly kind: 'final_text'; readonly text: string }
  | { readonly kind: 'usage'; readonly tokens: number }
  | { readonly kind: 'failed'; readonly detail: string };
export type SessionRequest = { readonly prompt: string; readonly harnessArgs: readonly string[] };
export type SessionCommand = { readonly executable: string; readonly args: readonly string[]; readonly stdin: string };
export interface SessionLauncher {
  readonly harness: HarnessId;
  readonly executableNames: readonly string[];
  buildCommand(request: SessionRequest): SessionCommand;
  parseLine(line: string): readonly SessionStreamEvent[];
}

export type HarnessSessionRequest = {
  readonly command: SessionCommand;
  readonly environment: Readonly<Record<string, string>>;
  readonly parseLine: (line: string) => readonly SessionStreamEvent[];
  readonly onEvent: (event: SessionStreamEvent) => void;
};
export type HarnessSessionExit = { readonly exitCode: number | null; readonly spawnFailed: boolean; readonly unparsedLines: number };
export interface RunningHarnessSession {
  readonly exit: Promise<HarnessSessionExit>;
  stop(): Promise<void>;
}
export interface HarnessSessionProcess {
  start(request: HarnessSessionRequest): RunningHarnessSession;
}

export type ValidationRequest = { readonly command: string; readonly timeoutMilliseconds: number };
export type ValidationOutcome = { readonly status: 'passed' | 'failed' | 'timed_out'; readonly exitCode: number | null; readonly durationMs: number; readonly outputTail: string };
export interface RunningValidation {
  readonly outcome: Promise<ValidationOutcome>;
  stop(): Promise<void>;
}
export interface ValidationExecutor {
  start(request: ValidationRequest): RunningValidation;
}

export const STATE_FILES = ['plan', 'checkpoint'] as const;
export type StateFile = (typeof STATE_FILES)[number];
export interface RunStore {
  writeRecord(record: RunRecord): Promise<void>;
  readRecord(runId: string): Promise<RunRecord | null>;
  appendSession(runId: string, line: RunSessionLine): Promise<void>;
  latestRunId(): Promise<string | null>;
  snapshotState(runId: string): Promise<void>;
  restoreState(runId: string, files: readonly StateFile[]): Promise<void>;
  pruneRuns(): Promise<number>;
}

export interface ApprovalStore {
  read(): Promise<ApprovalsFile>;
  write(file: ApprovalsFile): Promise<void>;
}

export type RunLockHolder = { readonly pid: number; readonly runId: string };
export interface RunLock {
  acquire(holder: RunLockHolder): Promise<RunLockHolder | null>;
  release(): Promise<void>;
}

export interface Hasher {
  sha256(text: string): string;
}
export type CommandForApproval = { readonly stepId: PlanStepId; readonly command: string; readonly hash: string };
export interface CommandApprover {
  approve(commands: readonly CommandForApproval[]): Promise<boolean>;
}
export interface StepApprover {
  approve(step: PlanStep): Promise<boolean>;
}

export type LedgerReading = { readonly zone: Zone | null; readonly tokens: TokenCount | null };
export interface LedgerWatch {
  latest(): LedgerReading;
  stop(): Promise<LedgerReading>;
}
export interface LedgerWatcher {
  watch(session: ActiveSession, onReading: (reading: LedgerReading) => void): LedgerWatch;
}
