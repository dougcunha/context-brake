import { describe, expect, it } from 'vitest';
import type { ErrorLine, RuntimeErrorCode } from '../../src/core/contracts/session-ledger.js';
import { ERRORS_LOG_RELATIVE_PATH, RUNTIME_ERROR_WINDOW_HOURS, runtimeErrorFindings, selectRecentErrors } from '../../src/core/services/runtime-error-checks.js';

const NOW = '2026-09-15T12:00:00.000Z';

function errorLine(at: string, code: RuntimeErrorCode): ErrorLine {
  return { v: 1, at, harness: 'claude-code', event: 'PostToolUse', code, detail: 'RuntimeFailure' };
}

describe('runtime error findings (RF20, DEC-11, prd-12 FR-09)', () => {
  it('warns about recorded runtime errors with the count and their codes', () => {
    const errors = [errorLine(NOW, 'INVALID_CONFIG'), errorLine(NOW, 'UNEXPECTED'), errorLine(NOW, 'INVALID_CONFIG')];
    const [finding] = runtimeErrorFindings({ errors });
    expect(finding).toMatchObject({ code: 'RUNTIME_ERRORS_RECORDED', severity: 'warning', scope: 'project', harness: null, path: ERRORS_LOG_RELATIVE_PATH });
    expect(finding?.message).toContain('3 runtime errors');
    expect(finding?.message).toContain('INVALID_CONFIG, UNEXPECTED');
    expect(finding?.remediation).toBeTruthy();
  });
  it('emits no finding when there are no errors', () => {
    expect(runtimeErrorFindings({ errors: [] })).toEqual([]);
  });
  it('keeps only errors inside the 24-hour window through the injected clock', () => {
    const errors = [errorLine('2026-09-15T11:00:00.000Z', 'UNEXPECTED'), errorLine('2026-09-14T12:00:00.000Z', 'UNEXPECTED'), errorLine('2026-09-14T11:59:59.999Z', 'UNEXPECTED')];
    expect(RUNTIME_ERROR_WINDOW_HOURS).toBe(24);
    expect(selectRecentErrors(errors, new Date(NOW)).map((line) => line.at)).toEqual(['2026-09-15T11:00:00.000Z', '2026-09-14T12:00:00.000Z']);
  });
});
