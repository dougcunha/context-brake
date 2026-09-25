import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey, ToolCall } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, SessionLedger, ToolLine } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';

const AT = '2026-09-25T12:00:00.000Z';
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const READ: ToolCall = { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const ALWAYS_INJECT: ContextBrakeConfig = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, injectionMode: 'always' } };
const GREEN_CHARACTERS = 0;
const YELLOW_CHARACTERS = 200000;
const RED_CHARACTERS = 300000;
const CRITICAL_CHARACTERS = 400000;

function toolLine(observedCharacters: number): ToolLine {
  return { v: 1, type: 'tool', at: AT, toolUseId: 'toolu_1', observedCharacters, turn: 1, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone: 'GREEN' };
}
function ledgerWith(lines: readonly LedgerLine[]): SessionLedger {
  return { readLines: async () => lines, appendSessionLine: async () => undefined, appendToolLine: async () => undefined, appendResetLine: async () => undefined, pruneStaleSessions: async () => 0 };
}
async function injectedBlock(characters: number, planExists: boolean): Promise<string> {
  const engine = createBrakeEngine({ descriptor: DESCRIPTOR, config: ALWAYS_INJECT, ledger: ledgerWith([toolLine(characters)]), blocks: { append: async () => undefined }, readValidationCommand: async () => null, planPresence: { exists: async () => planExists } });
  const decision = await engine.handle({ kind: 'post_tool', session: KEY, tool: READ, toolUseId: 'toolu_2' }, { observedCharacters: 0 });
  if (decision.kind !== 'context') throw new Error('expected context');
  return decision.block;
}

describe('brake engine plan-aware actions (FR-08, DEC-05, DEC-06, DEC-HIL-04, TC-07)', () => {
  it.each([
    { zone: 'YELLOW', characters: YELLOW_CHARACTERS, withPlan: 'finish the current edit, start no new step, run the step validation', withoutPlan: 'keep working; finish the current unit before large new explorations' },
    { zone: 'RED', characters: RED_CHARACTERS, withPlan: 'save plan and checkpoint, commit if validation passes, end reply with [REQUEST_SESSION_RESET]', withoutPlan: 'finish or pause the current unit, record progress, end reply with [REQUEST_SESSION_RESET]' },
  ])('injects the plan or no-plan $zone action by plan presence', async ({ zone, characters, withPlan, withoutPlan }) => {
    expect(await injectedBlock(characters, true)).toContain(`zone=${zone} action=${withPlan}`);
    const withoutPlanBlock = await injectedBlock(characters, false);
    expect(withoutPlanBlock).toContain(`zone=${zone} action=${withoutPlan}`);
    expect(withoutPlanBlock).not.toMatch(/start no new|do not start/i);
  });
  it.each([['GREEN', GREEN_CHARACTERS], ['CRITICAL', CRITICAL_CHARACTERS]] as const)('injects the same %s action with or without a plan file', async (zone, characters) => {
    const withPlan = await injectedBlock(characters, true);
    expect(withPlan).toContain(`zone=${zone} `);
    expect(await injectedBlock(characters, false)).toBe(withPlan);
  });
});
