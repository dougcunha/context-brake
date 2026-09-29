import { describe, expect, it } from 'vitest';
import type { ToolLine } from '../../src/core/contracts/session-ledger.js';
import type { WindowOrigin } from '../../src/core/contracts/zones.js';
import { runSession } from '../../src/core/services/run-session.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { readingFromLedger } from '../../src/infrastructure/runner/node-ledger-watcher.js';
import { runContext } from '../helpers/run-fakes.js';
import { planWithStatuses } from '../helpers/run-plans.js';
import { RunWorld } from '../helpers/run-world.js';

const LIMITS = { criticalGraceSeconds: 120, maxSessionMinutes: 5, maxTotalMinutes: 60 };

async function endOf(windowOrigin: WindowOrigin) {
  const world = new RunWorld(planWithStatuses(['IN_PROGRESS']));
  world.sessions = [{ events: [{ kind: 'started', sessionId: 's-1' }], zone: 'CRITICAL', windowOrigin, hang: true }];
  return runSession(runContext(world, LIMITS), { prompt: 'PROMPT', runStartedAt: world.now(), priorTokens: 0, onStarted: async () => undefined });
}

describe('runner CRITICAL cut only with a trusted window (prd-09 FR-09, DEC-12, TC-16)', () => {
  it('keeps a session whose CRITICAL reading used the fallback window until another limit ends it', async () => {
    expect(await endOf('config')).toMatchObject({ endReason: 'session_timeout', finalZone: 'CRITICAL' });
  });
  it.each<WindowOrigin>(['harness', 'declared'])('ends a CRITICAL session with a %s window after the grace', async (origin) => {
    expect((await endOf(origin)).endReason).toBe('critical_ceiling');
  });
  it('reads a ledger line written before the origin existed as untrusted', () => {
    const line: ToolLine = { v: 1, type: 'tool', at: '2026-09-28T17:00:00.000Z', toolUseId: 't1', observedCharacters: 0, turn: 1, usedTokens: 98000, windowTokens: 128000, estimatedTokens: 0, source: 'measured', zone: 'CRITICAL' };
    expect(readingFromLedger(summarizeLedger([line]))).toMatchObject({ zone: 'CRITICAL', windowOrigin: undefined });
    expect(readingFromLedger(summarizeLedger([{ ...line, windowOrigin: 'harness' }])).windowOrigin).toBe('harness');
  });
});
