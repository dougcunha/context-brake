import { describe, expect, it } from 'vitest';
import type { ErrorLine, RuntimeErrorCode } from '../../src/core/contracts/session-ledger.js';
import { runtimeErrorFindings, selectRecentErrors } from '../../src/core/services/runtime-error-checks.js';

const NOW = '2026-09-15T12:00:00.000Z';
const ERRORS_LOG = '.context-brake/runtime/errors.jsonl';

function errorLine(at: string, code: RuntimeErrorCode): ErrorLine {
  return { v: 1, at, harness: 'claude-code', event: 'PostToolUse', code, detail: 'RuntimeFailure' };
}

describe('runtime error findings (RF20, DEC-11, prd-12 FR-09)', () => {
  it('warns about recorded runtime errors with the count and their distinct codes in order', () => {
    const errors = [errorLine(NOW, 'UNEXPECTED'), errorLine(NOW, 'INVALID_CONFIG'), errorLine(NOW, 'UNEXPECTED')];
    expect(runtimeErrorFindings({ errors })).toEqual([{
      code: 'RUNTIME_ERRORS_RECORDED', severity: 'warning', scope: 'project', harness: null, path: ERRORS_LOG,
      message: 'ContextBrake recorded 3 runtime errors in the last 24 hours (codes: INVALID_CONFIG, UNEXPECTED).',
      impact: 'Telemetry can fall back to the last recorded zone until the runtime failure is fixed.',
      remediation: `Inspect ${ERRORS_LOG} and fix the reported failures.`,
    }]);
  });
  it('emits no finding when there are no errors', () => {
    expect(runtimeErrorFindings({ errors: [] })).toEqual([]);
  });
  it('keeps only errors inside the 24-hour window through the injected clock', () => {
    const errors = [errorLine('2026-09-15T11:00:00.000Z', 'UNEXPECTED'), errorLine('2026-09-14T12:00:00.000Z', 'UNEXPECTED'), errorLine('2026-09-14T11:59:59.999Z', 'UNEXPECTED')];
    expect(selectRecentErrors(errors, new Date(NOW)).map((line) => line.at)).toEqual(['2026-09-15T11:00:00.000Z', '2026-09-14T12:00:00.000Z']);
  });
});
