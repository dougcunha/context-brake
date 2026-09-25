import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { BlockLog, RuntimeErrorLog, SessionLedger } from '../../src/core/contracts/session-ledger.js';
import { createBrakeEngine, type BootReader } from '../../src/core/services/brake-engine.js';

const KEY: SessionKey = { harness: 'claude-code', sessionId: 's-1', agentId: null };
const CAPABLE: RuntimeDescriptor = {
  harness: 'claude-code',
  capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'session_boot', state: 'supported' }],
  estimation: { baselineTokens: 15000, tokensPerTurn: 150 },
  newSessionCommand: '/clear',
};
const UNCAPABLE: RuntimeDescriptor = {
  ...CAPABLE,
  harness: 'opencode',
  capabilities: [{ id: 'pre_tool_block', state: 'supported' }, { id: 'session_boot', state: 'unsupported' }],
};

function createMockLedger(): SessionLedger {
  return {
    readLines: async () => [],
    appendSessionLine: async () => undefined,
    appendToolLine: async () => undefined,
    appendResetLine: async () => undefined,
    pruneStaleSessions: async () => 0,
  };
}

function setupEngine(descriptor: RuntimeDescriptor, readBoot?: BootReader, errors?: RuntimeErrorLog) {
  const ledger = createMockLedger();
  const blocks: BlockLog = { append: async () => undefined };
  return { ledger, engine: createBrakeEngine({ descriptor, config: DEFAULT_CONFIG, ledger, blocks, readValidationCommand: async () => null, planPresence: { exists: async () => true }, readBoot, errors }) };
}

describe('brake engine session boot delivery (RF9, RF10, RF11, TC-05, TC-06)', () => {
  it('delivers boot and invalid_state as context decision when session_boot is supported', async () => {
    const boot = setupEngine(CAPABLE, async () => ({ kind: 'boot', text: '[ContextBrake boot v1] Ready' }));
    expect(await boot.engine.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'context', block: '[ContextBrake boot v1] Ready' });
    const invalid = setupEngine(CAPABLE, async () => ({ kind: 'invalid_state', text: '[ContextBrake boot v1] Repair file' }));
    expect(await invalid.engine.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'context', block: '[ContextBrake boot v1] Repair file' });
  });

  it('returns neutral when boot policy returns none or harness lacks capability', async () => {
    const none = setupEngine(CAPABLE, async () => ({ kind: 'none' }));
    expect(await none.engine.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'neutral' });
    const uncapable = setupEngine(UNCAPABLE, async () => ({ kind: 'boot', text: 'boot' }));
    expect(await uncapable.engine.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'neutral' });
  });

  it('delivers boot on compaction only for compaction-capable harnesses', async () => {
    const claude = setupEngine(CAPABLE, async () => ({ kind: 'boot', text: 'boot' }));
    expect(await claude.engine.handle({ kind: 'session_reset', session: KEY, reason: 'compact' })).toEqual({ kind: 'context', block: 'boot' });
    const cursorDescriptor: RuntimeDescriptor = { ...CAPABLE, harness: 'cursor' };
    const cursor = setupEngine(cursorDescriptor, async () => ({ kind: 'boot', text: 'boot' }));
    expect(await cursor.engine.handle({ kind: 'session_reset', session: KEY, reason: 'compact' })).toEqual({ kind: 'neutral' });
  });

  it('logs failure and returns neutral without throwing when readBoot fails', async () => {
    const appendError = vi.fn().mockResolvedValue(undefined);
    const errors: RuntimeErrorLog = { append: appendError };
    const failing = setupEngine(CAPABLE, async () => { throw new Error('disk read failed'); }, errors);
    expect(await failing.engine.handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'neutral' });
    expect(appendError).toHaveBeenCalledWith('claude-code', expect.objectContaining({ event: 'session_reset', code: 'UNEXPECTED' }));
  });
});
