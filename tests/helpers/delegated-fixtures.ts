import type { PlanPresence } from '../../src/core/contracts/checkpoint-mode.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig, type DelegatedSnapshotConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { BlockLog, BlockRecordInput, LedgerLine, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';

export const DELEGATED_AT = '2026-09-24T12:00:00.000Z';
export const DELEGATED_KEY: SessionKey = { harness: 'claude-code', sessionId: 'delegated-1', agentId: null };
export const DELEGATED_DESCRIPTOR: RuntimeDescriptor = {
  harness: 'claude-code',
  capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'tool_coverage', state: 'supported' }, { id: 'session_boot', state: 'supported' }],
  estimation: { baselineTokens: 15000, tokensPerTurn: 150 },
  newSessionCommand: '/clear',
};
export const SNAPSHOT_SECTION: DelegatedSnapshotConfig = { snapshotCommand: '/sdd-snapshot', triggerZone: 'RED', allowedPaths: ['tasks/**/context-snapshot.md'], allowedSkills: [] };
export function delegatedConfig(section: Partial<DelegatedSnapshotConfig> = {}): ContextBrakeConfig {
  return { ...DEFAULT_CONFIG, delegatedSnapshot: { ...SNAPSHOT_SECTION, ...section } };
}
export class CountingPresence implements PlanPresence {
  calls = 0;
  constructor(public present = false) {}
  async exists(): Promise<boolean> { this.calls += 1; return this.present; }
}
export class FailingPresence implements PlanPresence {
  async exists(): Promise<boolean> { throw new Error('stat failed'); }
}
export function delegatedToolLine(turn: number): ToolLine {
  return { v: 1, type: 'tool', at: DELEGATED_AT, toolUseId: `toolu_${turn}`, observedCharacters: 0, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: turn >= 12 ? 'CRITICAL' : 'GREEN' };
}
export function sessionAtTurn(turns: number): LedgerLine[] {
  return Array.from({ length: turns }, (_, index) => delegatedToolLine(index + 1));
}
export class MemoryLedger implements SessionLedger {
  constructor(readonly lines: LedgerLine[] = []) {}
  async readLines(): Promise<readonly LedgerLine[]> { return [...this.lines]; }
  async appendSessionLine(): Promise<void> { return undefined; }
  async appendToolLine(): Promise<void> { return undefined; }
  async appendResetLine(): Promise<void> { return undefined; }
  async pruneStaleSessions(): Promise<number> { return 0; }
}
export class MemoryBlocks implements BlockLog {
  readonly records: BlockRecordInput[] = [];
  async append(_key: SessionKey, input: BlockRecordInput): Promise<void> { this.records.push(input); }
}
export function toolCall(call: Partial<ToolCall> & Pick<ToolCall, 'name' | 'category'>): ToolCall {
  return { paths: [], command: null, ...call };
}
