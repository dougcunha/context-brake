import { describe, expect, it } from 'vitest';
import { EXIT_CODES, exitCodeForSeverities } from '../../src/cli/exit-codes.js';

describe('exit severity policy (RF23, UT-20)', () => {
  it.each([
    [[], EXIT_CODES.healthy], [['ok'], EXIT_CODES.healthy], [['warning', 'ok'], EXIT_CODES.warning], [['error', 'warning'], EXIT_CODES.error],
  ])('returns the highest severity independent of order', (severities, expected) => expect(exitCodeForSeverities(severities)).toBe(expected));
  it('keeps usage and interruption codes named', () => expect(EXIT_CODES.invalidArguments).toBe(64));
});
