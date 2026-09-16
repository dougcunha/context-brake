import { describe, expect, it } from 'vitest';
import type { BlockLine, ErrorLine, SessionLine } from '../../src/core/contracts/session-ledger.js';
import type { RuntimeErrorCode } from '../../src/core/contracts/session-ledger.js';
import {
  BLOCKS_LOG_RELATIVE_PATH, brakeSessionFindings, ERRORS_LOG_RELATIVE_PATH,
  RUNTIME_ERROR_WINDOW_HOURS, selectRecentErrors, type RuntimeStateReading,
} from '../../src/core/services/brake-session-checks.js';

const CODEX_REASON = 'Hosted tools such as web search bypass Codex CLI hooks.';
const NOW = '2026-09-15T12:00:00.000Z';

function sessionLine(overrides: Partial<SessionLine> = {}): SessionLine {
  return { v: 1, type: 'session', at: NOW, harness: 'codex-cli', sessionId: 'session-1', agentId: null, brakeMode: 'cooperative', brakeReason: CODEX_REASON, ...overrides };
}

function blockLine(): BlockLine {
  return { v: 1, at: NOW, harness: 'claude-code', sessionId: 'session-1', agentId: null, tool: 'Read', zone: 'CRITICAL', turn: 12, percentage: 75, source: 'estimated', reason: 'critical_ceiling' };
}

function errorLine(at: string, code: RuntimeErrorCode): ErrorLine {
  return { v: 1, at, harness: 'claude-code', event: 'PreToolUse', code, detail: 'RuntimeFailure' };
}

function reading(overrides: Partial<RuntimeStateReading> = {}): RuntimeStateReading {
  return { sessions: [], blocks: [], errors: [], ...overrides };
}

describe('T05 brake session checks (TC-19, CA-17, CA-18, RF21)', () => {
  it('emits one cooperative warning per harness with the recent session IDs and the recorded reason', () => {
    const sessions = [
      sessionLine({ sessionId: 'codex-1', at: '2026-09-15T10:00:00.000Z' }),
      sessionLine({ sessionId: 'codex-2', at: '2026-09-15T11:00:00.000Z' }),
      sessionLine({ sessionId: 'claude-1', harness: 'claude-code', brakeMode: 'enforced', brakeReason: null }),
    ];
    const findings = brakeSessionFindings(reading({ sessions }));

    expect(findings).toEqual([
      {
        code: 'BRAKE_COOPERATIVE', severity: 'warning', scope: 'harness', harness: 'codex-cli', path: null,
        message: 'The codex-cli brake is cooperative; recent session IDs: codex-2, codex-1.',
        impact: CODEX_REASON,
        remediation: 'Use a harness with an enforced brake for guaranteed blocking, or treat zone limits as advisory for this harness.',
      },
      {
        code: 'BRAKE_BLOCKS_RECORDED', severity: 'ok', scope: 'project', harness: null, path: BLOCKS_LOG_RELATIVE_PATH,
        message: `ContextBrake recorded 0 blocked tool calls in ${BLOCKS_LOG_RELATIVE_PATH}.`,
        impact: null, remediation: null,
      },
    ]);
  });
});
describe('T05 block findings (CA-18, RF20)', () => {
  it('names only the five most recent cooperative session IDs', () => {
    const sessions = Array.from({ length: 7 }, (_, index) => sessionLine({ sessionId: `codex-${index}`, at: `2026-09-15T0${index}:00:00.000Z` }));
    const [finding] = brakeSessionFindings(reading({ sessions }));
    expect(finding?.message).toContain('codex-6');
    expect(finding?.message).toContain('codex-2');
    expect(finding?.message).not.toContain('codex-1');
    expect(finding?.message).not.toContain('codex-0');
  });

  it('reports the block count and the log path as an ok finding', () => {
    const [finding] = brakeSessionFindings(reading({ blocks: [blockLine(), blockLine()] }));
    expect(finding).toMatchObject({ code: 'BRAKE_BLOCKS_RECORDED', severity: 'ok', scope: 'project', path: BLOCKS_LOG_RELATIVE_PATH });
    expect(finding?.message).toContain('2');
  });
});
describe('T05 runtime error findings (RF20, DEC-11)', () => {
  it('warns about recorded runtime errors with the count and their codes', () => {
    const errors = [
      errorLine(NOW, 'INVALID_CONFIG'),
      errorLine(NOW, 'UNEXPECTED'),
      errorLine(NOW, 'INVALID_CONFIG'),
    ];
    const finding = brakeSessionFindings(reading({ errors })).find((f) => f.code === 'RUNTIME_ERRORS_RECORDED');
    expect(finding).toMatchObject({ severity: 'warning', scope: 'project', harness: null, path: ERRORS_LOG_RELATIVE_PATH });
    expect(finding?.message).toContain('3');
    expect(finding?.message).toContain('INVALID_CONFIG, UNEXPECTED');
    expect(finding?.remediation).toBeTruthy();
  });

  it('emits no error finding when there are no errors', () => {
    expect(brakeSessionFindings(reading()).some((f) => f.code === 'RUNTIME_ERRORS_RECORDED')).toBe(false);
  });

  it('keeps only errors inside the 24-hour window through the injected clock', () => {
    const now = new Date(NOW);
    const errors = [
      errorLine('2026-09-15T11:00:00.000Z', 'UNEXPECTED'),
      errorLine('2026-09-14T12:00:00.000Z', 'UNEXPECTED'),
      errorLine('2026-09-14T11:59:59.999Z', 'UNEXPECTED'),
    ];
    expect(RUNTIME_ERROR_WINDOW_HOURS).toBe(24);
    expect(selectRecentErrors(errors, now).map((line) => line.at)).toEqual(['2026-09-15T11:00:00.000Z', '2026-09-14T12:00:00.000Z']);
  });
});
