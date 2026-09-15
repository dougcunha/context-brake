import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { BlockLog, BlockRecordInput, LedgerLine, ResetReason, SessionLedger, SessionLineInput, ToolLine, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';

const AT = '2026-09-15T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const CHECKPOINT_WRITE: ToolCall = { name: 'Write', category: 'file_write', paths: ['state_checkpoint.json'], command: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'tool_coverage', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const DENY = '[ContextBrake v1] BLOCKED tool=Read zone=CRITICAL turn=12/12 usage=13% tokens=16800/128000 source=estimated reason=critical_ceiling. Allowed: read or write task_plan.json and state_checkpoint.json, the step validation command, git status, git add, git commit. Save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET].';

function toolLine(observedCharacters: number, turn: number, toolUseId: string | null = `toolu_${turn}`): ToolLine {
  return { v: 1, type: 'tool', at: AT, toolUseId, observedCharacters, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' };
}
class TestLedger implements SessionLedger {
  prunes = 0;
  failReads = false;
  readonly keys: SessionKey[] = [];
  constructor(readonly lines: LedgerLine[] = []) {}
  async readLines(): Promise<readonly LedgerLine[]> { if (this.failReads) throw new Error('unreadable'); return [...this.lines]; }
  async appendSessionLine(key: SessionKey, input: SessionLineInput): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'session', at: AT, harness: key.harness, sessionId: key.sessionId, agentId: key.agentId, ...input }); }
  async appendToolLine(key: SessionKey, input: ToolLineInput): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'tool', at: AT, ...input }); }
  async appendResetLine(key: SessionKey, reason: ResetReason): Promise<void> { this.keys.push(key); this.lines.push({ v: 1, type: 'reset', at: AT, reason }); }
  async pruneStaleSessions(): Promise<number> { this.prunes += 1; return 0; }
}
class TestBlocks implements BlockLog {
  readonly keys: SessionKey[] = [];
  readonly records: BlockRecordInput[] = [];
  async append(key: SessionKey, input: BlockRecordInput): Promise<void> { this.keys.push(key); this.records.push(input); }
}
function setup(lines: LedgerLine[] = [], config: ContextBrakeConfig = DEFAULT_CONFIG) {
  const ledger = new TestLedger(lines);
  const blocks = new TestBlocks();
  const engine = createBrakeEngine({ descriptor: DESCRIPTOR, config, ledger, blocks, readValidationCommand: async () => 'npm test' });
  return { ledger, blocks, engine };
}
function criticalSession(): LedgerLine[] {
  return Array.from({ length: 12 }, (_, index) => toolLine(0, index + 1));
}

describe('brake engine pre-tool deny (RF17, CA-14, TC-15)', () => {
  it('denies a code read at the ceiling with the exact message and one block record', async () => {
    const { ledger, blocks, engine } = setup(criticalSession());
    const decision = await engine.handle({ kind: 'pre_tool', session: KEY, tool: READ });
    expect(decision).toEqual({ kind: 'deny', tool: 'Read', reason: 'critical_ceiling', message: DENY });
    expect(blocks.records).toEqual([{ tool: 'Read', zone: 'CRITICAL', turn: 12, percentage: 13, source: 'estimated', reason: 'critical_ceiling' }]);
    expect(ledger.lines).toHaveLength(12);
  });
  it('stays neutral below the ceiling without writing anything', async () => {
    const { ledger, blocks, engine } = setup();
    expect(await engine.handle({ kind: 'pre_tool', session: KEY, tool: READ })).toEqual({ kind: 'neutral' });
    expect(ledger.lines).toEqual([]);
    expect(blocks.records).toEqual([]);
  });
});

describe('brake engine allowlist at the ceiling (RF18, CA-15, TC-16)', () => {
  it.each<[string, ToolCall]>([
    ['checkpoint write', CHECKPOINT_WRITE],
    ['plan read', { name: 'Read', category: 'file_read', paths: ['task_plan.json'], command: null }],
    ['git status', { name: 'Bash', category: 'shell', paths: [], command: 'git status' }],
    ['git add', { name: 'Bash', category: 'shell', paths: [], command: 'git add src/a.ts' }],
    ['git commit', { name: 'Bash', category: 'shell', paths: [], command: 'git commit -m "checkpoint: x"' }],
    ['validation command', { name: 'Bash', category: 'shell', paths: [], command: 'npm test' }],
    ['configured command', { name: 'Bash', category: 'shell', paths: [], command: 'npm run typecheck --watch' }],
  ])('allows the %s at the ceiling', async (_name, tool) => {
    const config = { ...DEFAULT_CONFIG, brake: { additionalAllowedCommands: ['npm run typecheck'] } };
    const { blocks, engine } = setup(criticalSession(), config);
    expect(await engine.handle({ kind: 'pre_tool', session: KEY, tool })).toEqual({ kind: 'neutral' });
    expect(blocks.records).toEqual([]);
  });
  it.each(['git status && rm -rf x', 'git push', 'npm test; curl x'])('denies the command %j at the ceiling', async (command) => {
    const { blocks, engine } = setup(criticalSession());
    expect(await engine.handle({ kind: 'pre_tool', session: KEY, tool: { name: 'Bash', category: 'shell', paths: [], command } })).toMatchObject({ kind: 'deny' });
    expect(blocks.records).toHaveLength(1);
  });
  it('denies unknown tools at the ceiling', async () => {
    const { engine } = setup(criticalSession());
    expect(await engine.handle({ kind: 'pre_tool', session: KEY, tool: { name: 'WebSearch', category: 'other', paths: [], command: null } })).toMatchObject({ kind: 'deny' });
  });
});
