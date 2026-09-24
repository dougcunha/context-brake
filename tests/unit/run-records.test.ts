import { describe, expect, it } from 'vitest';
import { approvalsFileSchema, runRecordSchema, runSessionLineSchema, type RunRecord, type RunSessionLine } from '../../src/core/contracts/run-records.js';
import { runSummarySchema, type RunSummary } from '../../src/core/contracts/run-summary.js';

const sessionLine: RunSessionLine = {
  v: 1, index: 1, harness: 'claude-code', sessionId: 'session-1', stepId: 2,
  startedAt: '2026-09-23T10:00:00.000Z', endedAt: '2026-09-23T10:04:12.000Z', durationMs: 252_000,
  endReason: 'reset_signal', streamParseErrors: 0, validation: { status: 'passed', exitCode: 0, durationMs: 1_500 },
  bootTokens: { value: 640, source: 'estimated' }, sessionTokens: { value: 48_000, source: 'measured' },
  finalZone: 'YELLOW', statusCorrections: [{ stepId: 3, from: 'COMPLETED', to: 'PENDING' }],
};
const runRecord: RunRecord = {
  v: 1, runId: 'run-1', harness: 'codex-cli', status: 'running', stopReason: null, limit: null,
  startedAt: '2026-09-23T10:00:00.000Z', endedAt: null, resumedFrom: null,
  activeSession: { harness: 'codex-cli', sessionId: 'thread-1', agentId: null },
  counters: { sessions: 1, stepsCompleted: 0, consecutiveFailures: 0, tokens: { value: 0, source: 'estimated' } },
};
const summary: RunSummary = {
  schemaVersion: 1, command: 'run', runId: 'run-1', status: 'stopped', exitCode: 4, stopReason: 'repeated_failure', limit: null,
  stepsCompleted: 1, stepsTotal: 3, sessionCount: 1, durationMs: 252_000, tokens: { value: 48_000, source: 'measured' },
  harnessArgs: ['--permission-mode', 'acceptEdits'], sessions: [sessionLine],
  decision: { reason: 'repeated_failure', stepId: 2, options: ['edit the plan', 'raise --max-failures', 'rerun run'] },
};

describe('run session line (RF17, DEC-14, CA-13)', () => {
  it('accepts every DEC-14 field', () => expect(runSessionLineSchema.parse(sessionLine)).toEqual(sessionLine));
  it('reads earlier v1 lines without streamParseErrors', () => {
    const { streamParseErrors, ...earlier } = sessionLine;
    expect(streamParseErrors).toBe(0);
    expect(runSessionLineSchema.parse(earlier)).toEqual(earlier);
  });
  it.each([-1, 1.5])('rejects streamParseErrors = %s', (count) => {
    expect(runSessionLineSchema.safeParse({ ...sessionLine, streamParseErrors: count }).success).toBe(false);
  });
  it('accepts a session without a started event or a final zone', () => {
    const line = { ...sessionLine, sessionId: null, finalZone: null, validation: { status: 'not_run', exitCode: null, durationMs: null } };
    expect(runSessionLineSchema.safeParse(line).success).toBe(true);
  });
  it.each(['prompt', 'response', 'output', 'finalText'])('rejects the content-like field %s', (field) => {
    expect(runSessionLineSchema.safeParse({ ...sessionLine, [field]: 'text' }).success).toBe(false);
  });
  it('rejects content inside the validation record', () => {
    expect(runSessionLineSchema.safeParse({ ...sessionLine, validation: { ...sessionLine.validation, outputTail: 'x' } }).success).toBe(false);
  });
  it.each([['endReason', 'crashed'], ['index', 0], ['durationMs', -1], ['finalZone', 'BLUE'], ['v', 2]])('rejects %s = %j', (field, value) => {
    expect(runSessionLineSchema.safeParse({ ...sessionLine, [field]: value }).success).toBe(false);
  });
});

describe('run record (DEC-12, DEC-14)', () => {
  it('accepts a running record with an active session key', () => expect(runRecordSchema.parse(runRecord)).toEqual(runRecord));
  it('rejects an active session with an agent identifier', () => {
    expect(runRecordSchema.safeParse({ ...runRecord, activeSession: { ...runRecord.activeSession, agentId: 'sub' } }).success).toBe(false);
  });
  it('rejects an unknown stop reason', () => expect(runRecordSchema.safeParse({ ...runRecord, stopReason: 'gave_up' }).success).toBe(false));
});

describe('approvals file (RF14, DEC-10)', () => {
  const hash = 'a'.repeat(64);
  it('accepts hash-bound approvals', () => {
    expect(approvalsFileSchema.safeParse({ v: 1, approved: [{ hash, stepId: 'build', approvedAt: '2026-09-23T10:00:00.000Z' }] }).success).toBe(true);
  });
  it.each(['A'.repeat(64), 'a'.repeat(63), 'npm test'])('rejects the hash %s', (invalid) => {
    expect(approvalsFileSchema.safeParse({ v: 1, approved: [{ hash: invalid, stepId: 1, approvedAt: '2026-09-23T10:00:00.000Z' }] }).success).toBe(false);
  });
  it('rejects a command text stored next to the hash', () => {
    expect(approvalsFileSchema.safeParse({ v: 1, approved: [{ hash, stepId: 1, approvedAt: 'now', command: 'npm test' }] }).success).toBe(false);
  });
});

describe('run summary (RF18, DEC-15, CA-13)', () => {
  it('accepts the DEC-15 document', () => expect(runSummarySchema.parse(summary)).toEqual(summary));
  it('accepts a completed run without a decision', () => {
    const { decision, ...completed } = summary;
    expect(decision).toBeDefined();
    expect(runSummarySchema.safeParse({ ...completed, status: 'completed', exitCode: 0, stopReason: 'completed' }).success).toBe(true);
  });
  it.each(['prompt', 'response', 'validationOutput'])('rejects the content-like field %s', (field) => {
    expect(runSummarySchema.safeParse({ ...summary, [field]: 'text' }).success).toBe(false);
  });
  it('rejects a running status, which only the run record carries', () => {
    expect(runSummarySchema.safeParse({ ...summary, status: 'running' }).success).toBe(false);
  });
  it('rejects a session line carrying content', () => {
    expect(runSummarySchema.safeParse({ ...summary, sessions: [{ ...sessionLine, response: 'text' }] }).success).toBe(false);
  });
});
