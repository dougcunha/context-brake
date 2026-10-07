import { DEFAULT_CONFIG, type ContextBrakeConfig, type SnapshotConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';

export const DELEGATED_AT = '2026-09-24T12:00:00.000Z';
export const CRITICAL_CHARACTERS_PER_LINE = 30000;
export const DELEGATED_KEY: SessionKey = { harness: 'claude-code', sessionId: 'delegated-1', agentId: null };
export const DELEGATED_DESCRIPTOR: RuntimeDescriptor = {
  harness: 'claude-code',
  capabilities: [{ id: 'session_boot', state: 'supported' }],
  estimation: { baselineTokens: 15000, tokensPerTurn: 150 },
  newSessionCommand: '/clear',
};
export const SNAPSHOT_SECTION: SnapshotConfig = { triggerZone: 'RED', command: '/sdd-snapshot' };
export function delegatedConfig(section: Partial<SnapshotConfig> = {}): ContextBrakeConfig {
  return { ...DEFAULT_CONFIG, snapshot: { ...SNAPSHOT_SECTION, ...section } };
}
export function delegatedToolLine(turn: number): ToolLine {
  return { v: 1, type: 'tool', at: DELEGATED_AT, toolUseId: `toolu_${turn}`, observedCharacters: CRITICAL_CHARACTERS_PER_LINE, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: turn >= 11 ? 'CRITICAL' : 'GREEN', windowOrigin: 'harness' };
}
export const BRIDGE_WINDOW_LINE: LedgerLine = { v: 1, type: 'statusline', at: DELEGATED_AT, windowTokens: 128000, inputTokens: null, usedPercentage: null, model: 'claude-opus-5-5' };
export function sessionAtTurn(turns: number): LedgerLine[] {
  return [BRIDGE_WINDOW_LINE, ...Array.from({ length: turns }, (_, index) => delegatedToolLine(index + 1))];
}
export class MemoryLedger implements SessionLedger {
  constructor(readonly lines: LedgerLine[] = []) {}
  async readLines(): Promise<readonly LedgerLine[]> { return [...this.lines]; }
  async appendSessionLine(): Promise<void> { return undefined; }
  async appendToolLine(): Promise<void> { return undefined; }
  async appendResetLine(): Promise<void> { return undefined; }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  async pruneStaleSessions(): Promise<number> { return 0; }
}
export function toolCall(call: Partial<ToolCall> & Pick<ToolCall, 'name' | 'category'>): ToolCall {
  return { paths: [], command: null, ...call };
}
