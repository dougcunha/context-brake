import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, snapshotSchema, type ContextBrakeConfig, type SnapshotConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, SessionLedger, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import type { Zone } from '../../src/core/contracts/zones.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { decideInjection } from '../../src/core/services/injection-policy.js';
import { slashInvocation } from '../../src/core/services/skill-invocation.js';
import { isResetDue, zoneAction } from '../../src/core/services/zone-guidance.js';

const WITH_COMMAND: SnapshotConfig = { triggerZone: 'RED', triggerPercentage: 40, command: 'sdd-snapshot' };
const RESET = 'then end reply with [REQUEST_SESSION_RESET]';
const RUN = `run "/sdd-snapshot", ${RESET}`;
const HANDOFF = 'save handoff to .context-brake/handoff.md, end reply with [REQUEST_SESSION_RESET]';
const SLASH = { invoke: slashInvocation };
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear', skillInvocation: slashInvocation };

class MemoryLedger implements SessionLedger {
  readonly lines: LedgerLine[] = [];
  async readLines(): Promise<readonly LedgerLine[]> { return [...this.lines]; }
  async appendSessionLine(): Promise<void> { return undefined; }
  async appendToolLine(...[, input]: [SessionKey, ToolLineInput]): Promise<void> { this.lines.push({ v: 1, type: 'tool', at: '2026-10-19T12:00:00.000Z', ...input }); }
  async appendResetLine(): Promise<void> { return undefined; }
  async appendStatuslineLine(): Promise<void> { return undefined; }
  async pruneStaleSessions(): Promise<number> { return 0; }
}

function configWith(snapshot: SnapshotConfig): ContextBrakeConfig {
  return { ...DEFAULT_CONFIG, snapshot };
}

async function blockAt(snapshot: SnapshotConfig, tokens: number): Promise<string | null> {
  const engine = createBrakeEngine({ descriptor: DESCRIPTOR, config: configWith(snapshot), ledger: new MemoryLedger() });
  const decision = await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_1' }, { measured: { tokens, contextWindow: 128000 } });
  return decision.kind === 'context' ? decision.block : null;
}

describe('snapshot trigger percentage in the configuration', () => {
  it.each([[1, true], [100, true], [0, false], [101, false], [40.5, false]])('accepts %s as %s', (value, accepted) => {
    expect(snapshotSchema.safeParse({ triggerPercentage: value }).success).toBe(accepted);
  });
  it('keeps the zone default and leaves the percentage unset', () => {
    expect(snapshotSchema.parse({})).toEqual({ triggerZone: 'RED' });
  });
});

describe('zone actions with a trigger percentage', () => {
  it.each<{ label: string; zone: Zone; usagePercentage: number; expected: string }>([
    { label: 'one point below the percentage in GREEN', zone: 'GREEN', usagePercentage: 39, expected: 'work normally' },
    { label: 'the percentage in GREEN', zone: 'GREEN', usagePercentage: 40, expected: RUN },
    { label: 'above the percentage in YELLOW', zone: 'YELLOW', usagePercentage: 55, expected: RUN },
    { label: 'above the percentage in CRITICAL', zone: 'CRITICAL', usagePercentage: 80, expected: `run "/sdd-snapshot" now, ${RESET}` },
  ])('at $label', ({ zone, usagePercentage, expected }) => {
    expect(zoneAction(zone, WITH_COMMAND, { ...SLASH, usagePercentage })).toBe(expected);
  });
  it('ignores the trigger zone once a percentage is set', () => {
    expect(zoneAction('RED', { ...WITH_COMMAND, triggerPercentage: 70 }, { ...SLASH, usagePercentage: 60 })).toBe('finish or pause the current unit and tell the user what remains');
  });
  it('asks for the handoff at the percentage when no skill is configured', () => {
    expect(zoneAction('GREEN', { triggerZone: 'RED', triggerPercentage: 30 }, { mode: 'handoff', usagePercentage: 30 })).toBe(HANDOFF);
  });
  it('keeps the zone rule when no percentage is set', () => {
    expect(isResetDue({ zone: 'YELLOW', usagePercentage: 99 }, { triggerZone: 'RED' })).toBe(false);
    expect(isResetDue({ zone: 'RED', usagePercentage: 1 }, { triggerZone: 'RED' })).toBe(true);
  });
});

describe('injection of a reset due below the activation threshold', () => {
  it('lets the policy inject a GREEN block below the threshold when the reset is due', () => {
    const input = { telemetry: DEFAULT_CONFIG.telemetry, zone: 'GREEN', usagePercentage: 40, debug: false } as const;
    expect(decideInjection(input)).toBe(false);
    expect(decideInjection({ ...input, resetDue: true })).toBe(true);
  });
  it('delivers the reset action at 40% although telemetry starts at 50%', async () => {
    expect(await blockAt(WITH_COMMAND, 51200)).toContain(RUN);
    expect(await blockAt({ triggerZone: 'RED', command: 'sdd-snapshot' }, 51200)).toBeNull();
  });
});
