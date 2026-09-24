import { describe, expect, it } from 'vitest';
import { EXIT_CODES, exitCodeForSeverities, type Severity } from '../../src/cli/exit-codes.js';

describe('exit severity policy (RF23, UT-20)', () => {
  const cases: readonly [readonly Severity[], number][] = [
    [[], EXIT_CODES.healthy], [['ok'], EXIT_CODES.healthy], [['warning', 'ok'], EXIT_CODES.warning], [['error', 'warning'], EXIT_CODES.error],
  ];
  it.each(cases)('returns the highest severity independent of order', (severities, expected) => expect(exitCodeForSeverities(severities)).toBe(expected));
  it('keeps usage and interruption codes named', () => expect(EXIT_CODES.invalidArguments).toBe(64));
  it('adds the runner stop codes without changing existing codes (DEC-16)', () => {
    expect(EXIT_CODES).toEqual({ healthy: 0, warning: 1, error: 2, limitReached: 3, decisionRequired: 4, invalidArguments: 64, interrupted: 130 });
  });
});
