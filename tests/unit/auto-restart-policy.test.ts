import { describe, expect, it } from 'vitest';
import type { RestartReasonCode } from '../../src/core/contracts/auto-restart.js';
import { decideRestart, type RestartFacts } from '../../src/core/services/auto-restart-policy.js';

const READY: RestartFacts = {
  signal: true,
  standDown: { disabledByEnv: false, interactive: true },
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
  it('restarts on the signal alone (prd-12 FR-10)', () => {
    expect(decideRestart(READY)).toEqual(RESTART);
  });

  it('skips silently without the signal, whatever else is true', () => {
    expect(skipCode({ ...READY, signal: false })).toBe('SKIP_NO_SIGNAL');
    expect(skipCode({ ...READY, signal: false, standDown: { ...READY.standDown, disabledByEnv: true }})).toBe('SKIP_NO_SIGNAL');
  });
});

describe('loop guards (FR-04, FR-05, TC-04, TC-05)', () => {
  it('pauses the third consecutive restart with the limit at 2', () => {
    expect(decideRestart(guarded(1, 3))).toEqual(RESTART);
    expect(skipCode(guarded(2, 3))).toBe('PAUSED_LOOP_GUARD');
    expect(decideRestart(guarded(0, undefined))).toEqual(RESTART);
  });

  it('refuses a signal from a seeded session that did no tool call', () => {
    expect(skipCode(guarded(1, 0))).toBe('SKIP_NO_PROGRESS');
    expect(decideRestart(guarded(1, 3))).toEqual(RESTART);
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

  it('orders the stand-down reasons before the guards', () => {
    const hostile = guarded(5, 0);
    expect(skipCode({ ...hostile, standDown: { disabledByEnv: true, interactive: false } })).toBe('SKIP_DISABLED_ENV');
    expect(skipCode({ ...hostile, standDown: { disabledByEnv: false, interactive: false } })).toBe('SKIP_NON_INTERACTIVE');
    expect(skipCode(hostile)).toBe('PAUSED_LOOP_GUARD');
  });
});
