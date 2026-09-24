import type { RunProgressEvent, RunProgressListener } from '../../core/contracts/run-control.js';
import type { CommandForApproval } from '../../core/contracts/run-ports.js';
import type { RunSessionLine, ValidationStatus } from '../../core/contracts/run-records.js';
import type { RunSummary } from '../../core/contracts/run-summary.js';

export type TextStream = { write(text: string): unknown };
export type DecisionContext = { readonly stepTitle: string | null; readonly outputTail: string | null };

const VALIDATION_LABELS: Record<ValidationStatus, string> = { passed: 'PASS', failed: 'FAIL', timed_out: 'TIMEOUT', not_run: 'NOT_RUN' };
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_SECOND = 1_000;
const TOTAL_DURATION_NOTE = '  Duration bound: maxTotalMinutes covers harness sessions; final validation may add up to validationTimeoutSeconds, plus 10s stop grace.';

export function formatDuration(milliseconds: number): string {
  const seconds = Math.round(milliseconds / MILLISECONDS_PER_SECOND);
  if (seconds < SECONDS_PER_MINUTE) return `${seconds}s`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}s`;
  return `${Math.floor(minutes / MINUTES_PER_HOUR)}h${String(minutes % MINUTES_PER_HOUR).padStart(2, '0')}m`;
}

export function formatProgressLine(line: RunSessionLine, stepTitle: string): string {
  return [
    `Session ${line.index}`, `step ${String(line.stepId)} ${JSON.stringify(stepTitle)}`, `end ${line.endReason}`,
    `zone ${line.finalZone ?? 'n/a'}`, `validation ${VALIDATION_LABELS[line.validation.status]}`, formatDuration(line.durationMs),
  ].join(' | ');
}

export function formatCommandListing(commands: readonly CommandForApproval[]): string {
  const lines = commands.map((command) => `  - step ${String(command.stepId)}: ${command.command}`);
  return ['Validation commands that context-brake run will execute:', ...lines, ''].join('\n');
}

export function formatDecision(summary: RunSummary, context: DecisionContext): string {
  const decision = summary.decision;
  if (decision === undefined) return '';
  const step = decision.stepId === null ? '' : ` at step ${String(decision.stepId)}${context.stepTitle === null ? '' : ` ${JSON.stringify(context.stepTitle)}`}`;
  const lines = [`[STOP] Human decision required: ${decision.reason}${step}.`];
  if (context.outputTail !== null && context.outputTail.trim() !== '') {
    lines.push('  Validation output tail:', ...context.outputTail.trimEnd().split(/\r?\n/).map((text) => `    ${text}`));
  }
  lines.push('  Options:', ...decision.options.map((option) => `    - ${option}`));
  return `${lines.join('\n')}\n`;
}

export function formatSummary(summary: RunSummary): string {
  const label = summary.status === 'completed' ? '[OK]' : '[STOP]';
  const reason = summary.limit === null ? summary.stopReason : `${summary.stopReason}: ${summary.limit}`;
  const lines = [
    `${label} ContextBrake run: ${summary.status} (${reason})`,
    `  Run: ${summary.runId ?? 'none'}`,
    `  Steps completed: ${summary.stepsCompleted}/${summary.stepsTotal}`,
    `  Sessions: ${summary.sessionCount}`,
    `  Duration: ${formatDuration(summary.durationMs)}`,
    `  Tokens: ${summary.tokens.value} (${summary.tokens.source})`,
    `  Harness arguments: ${summary.harnessArgs.length === 0 ? 'none' : summary.harnessArgs.join(' ')}`,
  ];
  if (summary.status === 'completed' && summary.sessionCount === 0) lines.push('  Nothing to run: every step is already COMPLETED.');
  if (summary.limit === 'maxTotalMinutes') lines.push(TOTAL_DURATION_NOTE);
  return `${lines.join('\n')}\n`;
}

export class TextRunProgress implements RunProgressListener {
  constructor(private readonly stream: TextStream) {}

  onProgress(event: RunProgressEvent): void {
    if (event.kind === 'session_started') return;
    if (event.kind === 'commands_approved') {
      this.stream.write(`[OK] Approved ${event.commands.length} validation command(s) for this plan.\n`);
      return;
    }
    this.stream.write(`${formatProgressLine(event.line, event.stepTitle)}\n`);
    if (event.harnessDetail !== null) this.stream.write(`  Harness detail: ${event.harnessDetail}\n`);
  }
}
