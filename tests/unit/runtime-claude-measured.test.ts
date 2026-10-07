import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import type { ErrorRecordInput, LedgerLine, RuntimeErrorLog, SessionLedger, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { claudeDescriptor, mapClaudeEvent, mapClaudeInput } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';

const AT = '2026-09-25T12:00:00.000Z';
const FIXTURES = resolve('tests/fixtures/harnesses/claude-code');
const MAIN_TRANSCRIPT = resolve(FIXTURES, 'transcript-main.jsonl');

class MemoryLedger implements SessionLedger {
  readonly lines: LedgerLine[] = [];
  async readLines(): Promise<readonly LedgerLine[]> { return [...this.lines]; }
  async appendSessionLine(key: SessionKey): Promise<void> { this.lines.push({ v: 1, type: 'session', at: AT, harness: key.harness, sessionId: key.sessionId, agentId: key.agentId }); }
  async appendToolLine(_key: SessionKey, input: ToolLineInput): Promise<void> { this.lines.push({ v: 1, type: 'tool', at: AT, ...input }); }
  async appendResetLine(): Promise<void> { return Promise.resolve(); }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  async pruneStaleSessions(): Promise<number> { return 0; }
}
class MemoryErrors implements RuntimeErrorLog {
  readonly records: ErrorRecordInput[] = [];
  async append(_harness: string, input: ErrorRecordInput): Promise<void> { this.records.push(input); }
}
async function payloadOf(fixture: string, overrides: Record<string, unknown>): Promise<Record<string, unknown>> {
  return { ...(await loadHarnessPayload('claude-code', fixture) as Record<string, unknown>), ...overrides };
}
async function handle(eventName: string, payload: Record<string, unknown>, bridge: LedgerLine[] = []) {
  const ledger = new MemoryLedger();
  ledger.lines.push(...bridge);
  const errors = new MemoryErrors();
  const engine = createBrakeEngine({ descriptor: claudeDescriptor, config: DEFAULT_CONFIG, ledger });
  const input = await mapClaudeInput(eventName, payload, errors);
  const decision = await engine.handle(mapClaudeEvent(eventName, payload) as RuntimeEvent, input);
  return { ledger, errors, input, decision };
}

describe('Claude Code measured usage from the transcript (FR-04, FR-05, DEC-08, DEC-11, TC-17)', () => {
  it('reports the measured transcript usage in the post-tool block and the ledger tool line', async () => {
    const { ledger, errors, decision } = await handle('PostToolUse', await payloadOf('post-tool-use.json', { transcript_path: MAIN_TRANSCRIPT }));
    expect(decision.kind).toBe('context');
    expect(decision.kind === 'context' ? decision.block : '').toContain('tokens=194431/128000 source=measured');
    expect(ledger.lines.find((line) => line.type === 'tool')).toMatchObject({ source: 'measured', usedTokens: 194_431, windowTokens: 128_000 });
    expect(errors.records).toEqual([]);
  });
});

describe('Claude Code estimate fallback (FR-05, DEC-08, NFR-02, TC-17)', () => {
  it('keeps the estimate for a subagent payload even with a transcript path (DEC-08)', async () => {
    const { input, ledger } = await handle('PostToolUse', await payloadOf('post-tool-use.json', { transcript_path: MAIN_TRANSCRIPT, agent_id: 'agent-1' }));
    expect(input.measured).toBeUndefined();
    expect(ledger.lines.find((line) => line.type === 'tool')).toMatchObject({ source: 'estimated' });
  });

  it('keeps the estimate without logging when the transcript is missing (FR-05)', async () => {
    const { input, errors, ledger } = await handle('PostToolUse', await payloadOf('post-tool-use.json', {}));
    expect(input.measured).toBeUndefined();
    expect(ledger.lines.find((line) => line.type === 'tool')).toMatchObject({ source: 'estimated' });
    expect(errors.records).toEqual([]);
  });

  it('records a transcript I/O failure in the runtime error log and keeps the estimate (NFR-02, NFR-03)', async () => {
    const { input, errors, decision } = await handle('PostToolUse', await payloadOf('post-tool-use.json', { transcript_path: FIXTURES }));
    expect(input.measured).toBeUndefined();
    expect(decision).toEqual({ kind: 'neutral' });
    expect(errors.records).toEqual([{ event: 'PostToolUse', code: 'UNEXPECTED', detail: 'TranscriptUnreadableError' }]);
  });

  it('reads no transcript for lifecycle events', async () => {
    expect(await mapClaudeInput('SessionStart', { session_id: 's', transcript_path: MAIN_TRANSCRIPT }, new MemoryErrors())).toEqual({});
  });
});
