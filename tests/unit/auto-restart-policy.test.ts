import { describe, expect, it } from 'vitest';
import type { RestartReasonCode } from '../../src/core/contracts/auto-restart.js';
import { decideRestart, type RestartFacts } from '../../src/core/services/auto-restart-policy.js';

const READY: RestartFacts = {
  gate: 'checkpoint',
  signal: true,
  standDown: { disabledByEnv: false, runnerSession: false, interactive: true },
  checkpoint: 'valid',
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
  it('restarts on the signal with a valid checkpoint', () => {
    expect(decideRestart(READY)).toEqual(RESTART);
  });

  it('skips silently without the signal, whatever else is true', () => {
    expect(skipCode({ ...READY, signal: false })).toBe('SKIP_NO_SIGNAL');
    expect(skipCode({ ...READY, signal: false, standDown: { ...READY.standDown, disabledByEnv: true }, checkpoint: 'missing' })).toBe('SKIP_NO_SIGNAL');
  });
});

describe('checkpoint gate (FR-03, DEC-14, TC-03)', () => {
  it.each([
    ['missing', 'SKIP_CHECKPOINT_MISSING'],
    ['invalid', 'SKIP_CHECKPOINT_INVALID'],
    ['stale', 'SKIP_CHECKPOINT_STALE'],
    ['no-active-step', 'SKIP_NO_ACTIVE_STEP'],
  ] as const)('refuses a %s checkpoint in full mode', (state, code) => {
    expect(skipCode({ ...READY, checkpoint: state })).toBe(code);
  });

  it('ignores the checkpoint state in light mode', () => {
    for (const state of ['missing', 'invalid', 'stale', 'no-active-step'] as const) {
      expect(decideRestart({ ...READY, gate: 'signal-only', checkpoint: state })).toEqual(RESTART);
    }
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
    ['environment switch', { disabledByEnv: true, runnerSession: false, interactive: true }, 'SKIP_DISABLED_ENV'],
    ['runner session', { disabledByEnv: false, runnerSession: true, interactive: true }, 'SKIP_RUNNER_SESSION'],
    ['non-interactive session', { disabledByEnv: false, runnerSession: false, interactive: false }, 'SKIP_NON_INTERACTIVE'],
  ] as const)('stands down for the %s', (_name, standDown, code) => {
    expect(skipCode({ ...READY, standDown })).toBe(code);
  });

  it('orders the stand-down reasons before the checkpoint and the guards', () => {
    const hostile = { ...guarded(5, 0), checkpoint: 'missing' as const };
    expect(skipCode({ ...hostile, standDown: { disabledByEnv: true, runnerSession: true, interactive: false } })).toBe('SKIP_DISABLED_ENV');
    expect(skipCode({ ...hostile, standDown: { disabledByEnv: false, runnerSession: true, interactive: false } })).toBe('SKIP_RUNNER_SESSION');
    expect(skipCode(hostile)).toBe('SKIP_CHECKPOINT_MISSING');
  });
});
