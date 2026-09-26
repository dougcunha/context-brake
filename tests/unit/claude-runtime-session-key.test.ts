import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { BlockLog, LedgerLine, ResetReason, SessionLedger, SessionLineInput, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { summarizeLedger } from '../../src/core/services/session-counters.js';
import { claudeDescriptor, mapClaudeEvent } from '../../src/infrastructure/harnesses/claude-code/runtime.js';

const AT = '2026-09-15T12:00:00.000Z';
const MAIN: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const SUBAGENT: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: 'agent-7' };

class PerSessionLedger implements SessionLedger {
  readonly lines = new Map<string, LedgerLine[]>();
  async readLines(key: SessionKey): Promise<readonly LedgerLine[]> { return [...(this.lines.get(this.id(key)) ?? [])]; }
  async appendSessionLine(key: SessionKey, input: SessionLineInput): Promise<void> { this.push(key, { v: 1, type: 'session', at: AT, harness: key.harness, sessionId: key.sessionId, agentId: key.agentId, ...input }); }
  async appendToolLine(key: SessionKey, input: ToolLineInput): Promise<void> { this.push(key, { v: 1, type: 'tool', at: AT, ...input }); }
  async appendResetLine(key: SessionKey, reason: ResetReason): Promise<void> { this.push(key, { v: 1, type: 'reset', at: AT, reason }); }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  async pruneStaleSessions(): Promise<number> { return 0; }
  summary(key: SessionKey) { return summarizeLedger(this.lines.get(this.id(key)) ?? []); }
  private id(key: SessionKey): string { return `${key.sessionId}\0${key.agentId ?? ''}`; }
  private push(key: SessionKey, line: LedgerLine): void { this.lines.set(this.id(key), [...(this.lines.get(this.id(key)) ?? []), line]); }
}

const blocks: BlockLog = { append: async () => Promise.resolve() };

describe('Claude Code subagent session keys (RF4, CA-08, TC-10)', () => {
  it('counts subagent calls in their own ledger and leaves the main session untouched', async () => {
    const ledger = new PerSessionLedger();
    const engine = createBrakeEngine({ descriptor: claudeDescriptor, config: DEFAULT_CONFIG, ledger, blocks, readValidationCommand: async () => null, planPresence: { exists: async () => true } });
    const call = { tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } };
    await engine.handle(mapClaudeEvent('PostToolUse', { session_id: 'session-1', tool_use_id: 'main-1', ...call })!, { observedCharacters: 10 });
    await engine.handle(mapClaudeEvent('PostToolUse', { session_id: 'session-1', agent_id: 'agent-7', tool_use_id: 'sub-1', ...call })!, { observedCharacters: 10 });
    await engine.handle(mapClaudeEvent('PostToolUse', { session_id: 'session-1', agent_id: 'agent-7', tool_use_id: 'sub-2', ...call })!, { observedCharacters: 10 });
    expect(ledger.summary(MAIN).turns).toBe(1);
    expect(ledger.summary(SUBAGENT).turns).toBe(2);
    expect(ledger.lines.size).toBe(2);
  });
});
