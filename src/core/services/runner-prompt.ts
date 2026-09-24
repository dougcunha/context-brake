import type { PlanStepId } from '../contracts/task-plan.js';
import { SESSION_RESET_SIGNAL } from './reset-notice.js';

export const RUNNER_PROMPT_VERSION = 1;
export const PROMPT_OUTPUT_TAIL_CHARACTERS = 2_000;
const WRAP_COMMAND = 'context-brake wrap -- <command>';

export type PreviousFailure = { readonly status: 'failed' | 'timed_out'; readonly exitCode: number | null; readonly outputTail: string };
export type RunnerPromptFiles = { readonly planFile: string; readonly checkpointFile: string; readonly protocolFile: string };
export type RunnerPromptInput = {
  readonly session: { readonly index: number; readonly maxSessions: number };
  readonly step: { readonly id: PlanStepId; readonly title: string };
  readonly previousFailure: PreviousFailure | null;
  readonly files: RunnerPromptFiles;
};

export function renderRunnerPrompt(input: RunnerPromptInput): string {
  const opening = `ContextBrake runner session ${input.session.index} of at most ${input.session.maxSessions}. Work only on step ${String(input.step.id)}: ${input.step.title}.`;
  const closing = `Follow the session boot and the protocol in ${input.files.protocolFile}. Run commands through "${WRAP_COMMAND}" to see context telemetry. Before ending, update ${input.files.planFile} and ${input.files.checkpointFile}, then end your final message with ${SESSION_RESET_SIGNAL}.`;
  if (input.previousFailure === null) return `${opening} ${closing}`;
  return `${opening} ${renderFailureClause(input.previousFailure)}\n${closing}`;
}

function renderFailureClause(failure: PreviousFailure): string {
  const tail = failure.outputTail.slice(-PROMPT_OUTPUT_TAIL_CHARACTERS);
  return `The last validation of this step failed (${failureOutcome(failure)}). Output tail:\n${tail}`;
}

function failureOutcome(failure: PreviousFailure): string {
  if (failure.status === 'timed_out') return 'timed out';
  return `exit ${failure.exitCode ?? 'unknown'}`;
}
