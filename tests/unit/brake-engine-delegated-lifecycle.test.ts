import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import type { LedgerLine } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine } from '../../src/core/services/brake-engine.js';
import { CountingPresence, DELEGATED_DESCRIPTOR, DELEGATED_KEY, delegatedConfig, MemoryBlocks, MemoryLedger, sessionAtTurn, toolCall } from '../helpers/delegated-fixtures.js';

const BOOT_TEXT = '[ContextBrake boot v1] plan boot';
const RESET: RuntimeEvent = { kind: 'session_reset', session: DELEGATED_KEY, reason: 'clear' };
const READ = toolCall({ name: 'Read', category: 'file_read', paths: ['a.ts'] });
function engineWith(config: ContextBrakeConfig, lines: LedgerLine[] = [], present = false) {
  const presence = new CountingPresence(present);
  const engine = createBrakeEngine({ descriptor: DELEGATED_DESCRIPTOR, config, ledger: new MemoryLedger(lines), blocks: new MemoryBlocks(), readValidationCommand: async () => null, readBoot: async () => ({ kind: 'boot', text: BOOT_TEXT }), planPresence: presence });
  return { engine, presence };
}
function postTool(turn: number): RuntimeEvent {
  return { kind: 'post_tool', session: DELEGATED_KEY, tool: READ, toolUseId: `toolu_${turn}` };
}

describe('delegated session reset (TC-05, FR-08)', () => {
  it('injects the resume command when configured', async () => {
    const { engine } = engineWith(delegatedConfig({ resumeCommand: '/sdd-orchestrate-flow' }));
    expect(await engine.handle(RESET)).toEqual({ kind: 'context', block: '[ContextBrake boot v1] Run "/sdd-orchestrate-flow" before continuing.' });
  });
  it('stays neutral without a resume command', async () => {
    expect(await engineWith(delegatedConfig()).engine.handle(RESET)).toEqual({ kind: 'neutral' });
  });
  it('keeps the plan boot when the plan file exists', async () => {
    const { engine } = engineWith(delegatedConfig({ resumeCommand: '/resume' }), [], true);
    expect(await engine.handle(RESET)).toEqual({ kind: 'context', block: BOOT_TEXT });
  });
});

describe('lazy plan presence checks (TC-07, NFR-03)', () => {
  it('never checks the plan file without the section', async () => {
    const { engine, presence } = engineWith(DEFAULT_CONFIG, sessionAtTurn(11));
    await engine.handle(postTool(12));
    await engine.handle(RESET);
    expect(presence.calls).toBe(0);
  });
  it('skips the check on neutral paths', async () => {
    const { engine, presence } = engineWith(delegatedConfig());
    await engine.handle(postTool(1));
    await engine.handle({ kind: 'pre_tool', session: DELEGATED_KEY, tool: READ });
    expect(presence.calls).toBe(0);
  });
  it('checks at most once per emitting event', async () => {
    const { engine, presence } = engineWith(delegatedConfig(), sessionAtTurn(11));
    const decision = await engine.handle(postTool(12));
    expect(decision).toEqual({ kind: 'context', block: expect.stringContaining('action=run "/sdd-snapshot"') });
    expect(presence.calls).toBe(1);
  });
});
