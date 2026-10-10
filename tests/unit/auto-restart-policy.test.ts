import { describe, expect, it } from 'vitest';
import type { RestartReasonCode } from '../../src/core/contracts/auto-restart.js';
import { decideRestart, type RestartFacts } from '../../src/core/services/auto-restart-policy.js';

const READY: RestartFacts = {
  signal: true,
  standDown: { disabledByEnv: false, interactive: true },
  handoff: { required: false, writtenAt: null, turnStartedAt: undefined },
  guards: { consecutive: 0, maxConsecutive: 2, toolCallsSinceSeed: undefined },
};
const RESTART = { kind: 'restart' } as const;

function skipCode(facts: RestartFacts): RestartReasonCode | undefined {
  const decision = decideRestart(facts);
  return decision.kind === 'skip' ? decision.code : undefined;
}

function guarded(consecutive: number, toolCallsSinceSeed: number | undefined): RestartFacts {
  return { ...READY, guards: { consecutive, maxConsecutive: 2, toolCallsSinceSeed } };
}

describe('restart signal (FR-01, TC-01, TC-02)', () => {
  it('restarts on the signal alone and ignores the handoff in snapshot mode (prd-12 FR-10, prd-14 TC-04)', () => {
    expect(decideRestart(READY)).toEqual(RESTART);
  });

  it('skips silently without the signal, whatever else is true', () => {
    expect(skipCode({ ...READY, signal: false })).toBe('SKIP_NO_SIGNAL');
    expect(skipCode({ ...READY, signal: false, standDown: { ...READY.standDown, disabledByEnv: true }})).toBe('SKIP_NO_SIGNAL');
  });
});

describe('loop guards (FR-04, FR-05, TC-04, TC-05)', () => {
  it('pauses the third consecutive restart with the limit at 2, before the no-progress guard', () => {
    expect(decideRestart(guarded(1, 3))).toEqual(RESTART);
    expect(skipCode(guarded(2, 0))).toBe('PAUSED_LOOP_GUARD');
  });

  it('refuses a signal from a seeded session that did no tool call', () => {
    expect(skipCode(guarded(1, 0))).toBe('SKIP_NO_PROGRESS');
  });

  it('does not apply the no-progress guard to a session that was never seeded', () => {
    expect(decideRestart(guarded(0, 0))).toEqual(RESTART);
  });
});

describe('stand-down conditions (FR-06, TC-06)', () => {
  it.each([
    ['environment switch', { disabledByEnv: true, interactive: true }, 'SKIP_DISABLED_ENV'],
    ['non-interactive session', { disabledByEnv: false, interactive: false }, 'SKIP_NON_INTERACTIVE'],
  ] as const)('stands down for the %s', (_name, standDown, code) => {
    expect(skipCode({ ...READY, standDown })).toBe(code);
  });
});

describe('handoff gate (prd-14 FR-04, DEC-04, TC-04)', () => {
  const TURN_START = 1000;
  function withHandoff(writtenAt: number | null, turnStartedAt: number | undefined = TURN_START): RestartFacts {
    return { ...READY, handoff: { required: true, writtenAt, turnStartedAt } };
  }
  it('skips when the handoff is missing', () => {
    expect(skipCode(withHandoff(null))).toBe('SKIP_HANDOFF_MISSING');
  });
  it('skips when the handoff predates the turn that asked for it', () => {
    expect(skipCode(withHandoff(TURN_START - 1))).toBe('SKIP_HANDOFF_STALE');
  });
  it('restarts with a handoff written at the start of the turn', () => {
    expect(decideRestart(withHandoff(TURN_START))).toEqual(RESTART);
  });
  it('skips as stale when the turn start is unknown, since freshness cannot be proven (codereview_01 CR-01)', () => {
    expect(skipCode(withHandoff(1, undefined))).toBe('SKIP_HANDOFF_STALE');
  });
  it('orders the stand-down reasons, then the handoff gate, then the guards (FR-06, TC-06)', () => {
    const hostile = { ...withHandoff(null), guards: { consecutive: 5, maxConsecutive: 2, toolCallsSinceSeed: 0 } };
    expect(skipCode({ ...hostile, standDown: { disabledByEnv: true, interactive: false } })).toBe('SKIP_DISABLED_ENV');
    expect(skipCode({ ...hostile, standDown: { disabledByEnv: false, interactive: false } })).toBe('SKIP_NON_INTERACTIVE');
    expect(skipCode(hostile)).toBe('SKIP_HANDOFF_MISSING');
  });
});
