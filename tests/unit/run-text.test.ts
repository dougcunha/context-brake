import { describe, expect, it } from 'vitest';
import { formatCommandListing, formatDecision, formatDuration, formatProgressLine, formatSummary, TextRunProgress } from '../../src/cli/output/run-text.js';
import type { RunSummary } from '../../src/core/contracts/run-summary.js';
import { sessionLineAt } from '../helpers/run-records.js';

const COMPLETED: RunSummary = {
  schemaVersion: 1, command: 'run', runId: 'run-1', status: 'completed', exitCode: 0, stopReason: 'completed', limit: null,
  stepsCompleted: 3, stepsTotal: 3, sessionCount: 3, durationMs: 252_000, tokens: { value: 42_000, source: 'measured' }, harnessArgs: [], sessions: [],
};

describe('run text output (CMP-24, PRD user experience)', () => {
  it.each([[0, '0s'], [59_400, '59s'], [60_000, '1m00s'], [252_000, '4m12s'], [3_599_000, '59m59s'], [3_600_000, '1h00m'], [5_430_000, '1h30m']])('formats %d ms as %s', (milliseconds, text) => {
    expect(formatDuration(milliseconds)).toBe(text);
  });

  it('prints one labeled progress line per session', () => {
    const line = { ...sessionLineAt(3), stepId: 2, durationMs: 252_000, finalZone: 'YELLOW' as const, validation: { status: 'passed' as const, exitCode: 0, durationMs: 10 } };
    expect(formatProgressLine(line, 'Add parser')).toBe('Session 3 | step 2 "Add parser" | end reset_signal | zone YELLOW | validation PASS | 4m12s');
  });

  it('labels a session without a zone or validation', () => {
    const line = { ...sessionLineAt(1), finalZone: null, validation: { status: 'not_run' as const, exitCode: null, durationMs: null } };
    expect(formatProgressLine(line, 'x')).toContain('| zone n/a | validation NOT_RUN |');
  });
});

describe('run decision and command text (CMP-24, CA-04, CA-10)', () => {
  it('lists the commands to approve by step', () => {
    expect(formatCommandListing([{ stepId: 1, command: 'npm test', hash: 'h' }])).toBe('Validation commands that context-brake run will execute:\n  - step 1: npm test\n');
  });

  it('prints a decision request with the step, the output tail, and the options (CA-04)', () => {
    const summary: RunSummary = { ...COMPLETED, status: 'stopped', exitCode: 4, stopReason: 'repeated_failure', decision: { reason: 'repeated_failure', stepId: 2, options: ['edit the plan', 'raise --max-failures'] } };
    expect(formatDecision(summary, { stepTitle: 'Add parser', outputTail: 'FAIL a\r\nFAIL b\n' })).toBe([
      '[STOP] Human decision required: repeated_failure at step 2 "Add parser".', '  Validation output tail:', '    FAIL a', '    FAIL b',
      '  Options:', '    - edit the plan', '    - raise --max-failures', '',
    ].join('\n'));
  });

  it('omits the step and the tail when the decision has neither', () => {
    const summary: RunSummary = { ...COMPLETED, decision: { reason: 'confirmation_required', stepId: null, options: ['review'] } };
    expect(formatDecision(summary, { stepTitle: null, outputTail: null })).toBe('[STOP] Human decision required: confirmation_required.\n  Options:\n    - review\n');
    expect(formatDecision(COMPLETED, { stepTitle: null, outputTail: null })).toBe('');
  });
});

describe('run summary text (CMP-24, RF18)', () => {
  it('prints the summary with text labels and no color codes', () => {
    const text = formatSummary(COMPLETED);
    expect(text.split('\n')[0]).toBe('[OK] ContextBrake run: completed (completed)');
    expect(text).toContain('  Tokens: 42000 (measured)\n  Harness arguments: none\n');
    expect(text).not.toContain('\u001b[');
  });

  it('labels a stop with its limit, and a complete plan as nothing to run', () => {
    expect(formatSummary({ ...COMPLETED, status: 'stopped', stopReason: 'limit_reached', limit: 'maxSessions', harnessArgs: ['--x', 'y'] })).toMatch(/^\[STOP\] ContextBrake run: stopped \(limit_reached: maxSessions\)\n[\s\S]*Harness arguments: --x y\n$/);
    expect(formatSummary({ ...COMPLETED, sessionCount: 0 })).toContain('Nothing to run: every step is already COMPLETED.');
  });

  it('explains the final validation overrun only for a maxTotalMinutes stop (DEC-EXC-CR05)', () => {
    const stopped: RunSummary = { ...COMPLETED, status: 'stopped', exitCode: 3, stopReason: 'limit_reached', limit: 'maxTotalMinutes' };
    expect(formatSummary(stopped)).toContain('  Duration bound: maxTotalMinutes covers harness sessions; final validation may add up to validationTimeoutSeconds, plus 10s stop grace.\n');
    expect(formatSummary({ ...stopped, limit: 'maxSessions' })).not.toContain('Duration bound:');
    expect(formatSummary(COMPLETED)).not.toContain('Duration bound:');
  });
});

describe('TextRunProgress (CMP-24)', () => {
  it('writes the approval notice, the session line, and the harness detail to its stream', () => {
    const written: string[] = [];
    const progress = new TextRunProgress({ write: (text: string) => written.push(text) });
    progress.onProgress({ kind: 'session_started', index: 1, stepId: 1, stepTitle: 'x' });
    progress.onProgress({ kind: 'commands_approved', commands: [{ stepId: 1, command: 'npm test', hash: 'h' }] });
    progress.onProgress({ kind: 'session_finished', line: sessionLineAt(1), stepTitle: 'Step 1', outputTail: null, harnessDetail: 'Not logged in' });
    expect(written).toEqual([
      '[OK] Approved 1 validation command(s) for this plan.\n',
      'Session 1 | step 1 "Step 1" | end reset_signal | zone GREEN | validation FAIL | 1m00s\n',
      '  Harness detail: Not logged in\n',
    ]);
  });
});
