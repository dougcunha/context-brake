import { describe, expect, it } from 'vitest';
import { errorLineSchema } from '../../src/core/contracts/session-ledger.js';
import { selectRecentErrors } from '../../src/core/services/brake-session-checks.js';

const OLD_LINE = { v: 1, at: '2026-09-29T11:28:24.229Z', harness: 'claude-code', event: 'SessionStart', code: 'DEADLINE_EXCEEDED', detail: 'DeadlineExceededError' };
const NEW_LINE = { ...OLD_LINE, phase: 'boot_git', elapsedMs: 5003 };

describe('runtime error line compatibility (FR-11, NFR-03, TC-17)', () => {
  it('accepts lines written before the phase fields existed', () => {
    expect(errorLineSchema.safeParse(OLD_LINE).success).toBe(true);
  });
  it('accepts the phase and elapsed milliseconds of a deadline', () => {
    expect(errorLineSchema.parse(NEW_LINE)).toMatchObject({ phase: 'boot_git', elapsedMs: 5003 });
  });
  it('rejects an unknown phase and a negative duration', () => {
    expect(errorLineSchema.safeParse({ ...NEW_LINE, phase: 'somewhere' }).success).toBe(false);
    expect(errorLineSchema.safeParse({ ...NEW_LINE, elapsedMs: -1 }).success).toBe(false);
  });
  it('selects recent old and new lines alike for doctor', () => {
    const lines = [errorLineSchema.parse(OLD_LINE), errorLineSchema.parse(NEW_LINE)];
    expect(selectRecentErrors(lines, new Date('2026-09-29T12:00:00.000Z'))).toHaveLength(2);
  });
});
