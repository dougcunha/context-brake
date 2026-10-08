import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import type { ErrorRecordInput, LedgerLine, RuntimeErrorLog, SessionLedger, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { codexDescriptor, mapCodexEvent, mapCodexInput } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';

const AT = '2026-10-08T17:00:00.000Z';
const FIXTURES = resolve('tests/fixtures/harnesses/codex-cli');
const ROLLOUT = resolve(FIXTURES, 'rollout-token-count.jsonl');

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
async function payloadOf(overrides: Record<string, unknown>): Promise<Record<string, unknown>> {
  return { ...(await loadHarnessPayload('codex-cli', 'post-tool-use.json') as Record<string, unknown>), ...overrides };
}
async function handle(payload: Record<string, unknown>) {
  const ledger = new MemoryLedger();
  const errors = new MemoryErrors();
  const engine = createBrakeEngine({ descriptor: codexDescriptor, config: DEFAULT_CONFIG, ledger });
  const input = await mapCodexInput('PostToolUse', payload, errors);
  const decision = await engine.handle(mapCodexEvent('PostToolUse', payload) as RuntimeEvent, input);
  return { ledger, errors, input, decision };
}

describe('Codex CLI measured usage from the session rollout', () => {
  it('reports the rollout tokens and model window in the ledger tool line', async () => {
    const { ledger, errors, input } = await handle(await payloadOf({ transcript_path: ROLLOUT }));
    expect(input.measured).toEqual({ tokens: 78_260, contextWindow: 258_400, at: '2026-10-08T16:31:34.239Z' });
    expect(ledger.lines.find((line) => line.type === 'tool')).toMatchObject({ source: 'measured', usedTokens: 78_260, windowTokens: 258_400, windowOrigin: 'harness', zone: 'GREEN' });
    expect(errors.records).toEqual([]);
  });

  it('ignores the declared window once the rollout reports the model window', async () => {
    const ledger = new MemoryLedger();
    const config = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, declaredContextWindow: 100_000 } };
    const engine = createBrakeEngine({ descriptor: codexDescriptor, config, ledger });
    const payload = await payloadOf({ transcript_path: ROLLOUT });
    await engine.handle(mapCodexEvent('PostToolUse', payload) as RuntimeEvent, await mapCodexInput('PostToolUse', payload, new MemoryErrors()));
    expect(ledger.lines.find((line) => line.type === 'tool')).toMatchObject({ windowTokens: 258_400, windowOrigin: 'harness' });
  });

  it('reads no rollout for lifecycle events', async () => {
    expect(await mapCodexInput('SessionStart', { session_id: 's', transcript_path: ROLLOUT }, new MemoryErrors())).toEqual({});
  });
});

describe('Codex CLI estimate fallback', () => {
  it.each([
    ['a subagent payload', { transcript_path: ROLLOUT, agent_id: 'agent-1' }],
    ['a null transcript path', { transcript_path: null }],
    ['a missing transcript path', {}],
    ['a rollout without token_count info', { transcript_path: resolve(FIXTURES, 'rollout-no-token-count.jsonl') }],
  ])('keeps the estimate without logging for %s', async (_label, overrides) => {
    const { input, errors, ledger } = await handle(await payloadOf(overrides));
    expect(input.measured).toBeUndefined();
    expect(ledger.lines.find((line) => line.type === 'tool')).toMatchObject({ source: 'estimated', windowOrigin: 'config' });
    expect(errors.records).toEqual([]);
  });

  it('records a rollout I/O failure in the runtime error log and keeps the estimate', async () => {
    const { input, errors, decision } = await handle(await payloadOf({ transcript_path: FIXTURES }));
    expect(input.measured).toBeUndefined();
    expect(decision).toEqual({ kind: 'neutral' });
    expect(errors.records).toEqual([{ event: 'PostToolUse', code: 'UNEXPECTED', detail: 'TranscriptUnreadableError' }]);
  });
});
