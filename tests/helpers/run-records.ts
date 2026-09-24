import type { RunRecord, RunSessionLine } from '../../src/core/contracts/run-records.js';

export function runRecordAt(runId: string, startedAt: string): RunRecord {
  return {
    v: 1, runId, harness: 'claude-code', status: 'running', stopReason: null, limit: null, startedAt, endedAt: null, resumedFrom: null,
    activeSession: null, counters: { sessions: 0, stepsCompleted: 0, consecutiveFailures: 0, tokens: { value: 0, source: 'estimated' } },
  };
}

export function sessionLineAt(index: number): RunSessionLine {
  return {
    v: 1, index, harness: 'claude-code', sessionId: `session-${index}`, stepId: 1,
    startedAt: '2026-09-23T10:00:00.000Z', endedAt: '2026-09-23T10:01:00.000Z', durationMs: 60_000,
    endReason: 'reset_signal', streamParseErrors: 0, validation: { status: 'failed', exitCode: 1, durationMs: 900 },
    bootTokens: { value: 600, source: 'estimated' }, sessionTokens: { value: 30_000, source: 'measured' },
    finalZone: 'GREEN', statusCorrections: [{ stepId: 1, from: 'COMPLETED', to: 'IN_PROGRESS' }],
  };
}
