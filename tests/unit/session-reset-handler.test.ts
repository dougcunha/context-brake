import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { HandoffStore } from '../../src/core/contracts/handoff.js';
import type { ClaimDeadline } from '../../src/core/contracts/hook-phase.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { ResetReason, SessionLedger } from '../../src/core/contracts/session-ledger.js';
import { handleSessionReset } from '../../src/core/services/session-reset-handler.js';

const KEY: SessionKey = { harness: 'codex-cli', sessionId: 'session-1', agentId: null };
const ARCHIVED = '.context-brake/handoffs/20261007T120000.000Z.md';
const DESCRIPTOR: RuntimeDescriptor = { harness: 'codex-cli', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/new' };
const HANDOFF_CONFIG: ContextBrakeConfig = { ...DEFAULT_CONFIG, autoRestart: { maxConsecutiveRestarts: 2 } };
const RESUME = `[ContextBrake resume v1] Read "${ARCHIVED}" and continue the previous work from it.`;

class FakeHandoff implements HandoffStore {
  claims = 0;
  claimDeadline: ClaimDeadline | undefined;
  constructor(private pending: boolean) {}
  async pendingSince(): Promise<number | null> { return this.pending ? 1 : null; }
  async claim(deadline?: ClaimDeadline): Promise<string | null> {
    this.claims += 1;
    this.claimDeadline = deadline;
    if (!this.pending) return null;
    this.pending = false;
    return ARCHIVED;
  }
}

const ledger: SessionLedger = {
  readLines: async () => [],
  appendSessionLine: async () => undefined,
  appendToolLine: async () => undefined,
  appendResetLine: async () => undefined,
  appendStatuslineLine: async () => undefined,
  pruneStaleSessions: async () => 0,
};

function reset(handoff: FakeHandoff, reason: ResetReason, config: ContextBrakeConfig = HANDOFF_CONFIG): Promise<unknown> {
  return handleSessionReset({ descriptor: DESCRIPTOR, config, ledger, handoff }, { kind: 'session_reset', session: KEY, reason });
}

describe('handoff delivery at session start (prd-14 FR-02, FR-03, TC-02)', () => {
  it.each<ResetReason>(['new', 'clear'])('claims a pending handoff on %s and names the archived path', async (reason) => {
    const handoff = new FakeHandoff(true);
    await expect(reset(handoff, reason)).resolves.toEqual({ kind: 'context', block: RESUME });
  });
  it('passes the hook deadline to the claim (codereview_03 CR-01, codereview_05 CR-01)', async () => {
    const handoff = new FakeHandoff(true);
    const deadline: ClaimDeadline = { isExpired: () => false, commit: () => true };
    await handleSessionReset({ descriptor: DESCRIPTOR, config: HANDOFF_CONFIG, ledger, handoff }, { kind: 'session_reset', session: KEY, reason: 'new' }, { deadline });
    expect(handoff.claimDeadline).toBe(deadline);
  });
  it('delivers a handoff to one session only', async () => {
    const handoff = new FakeHandoff(true);
    await reset(handoff, 'new');
    await expect(reset(handoff, 'clear')).resolves.toEqual({ kind: 'neutral' });
  });
  it('neither claims nor injects on compaction', async () => {
    const handoff = new FakeHandoff(true);
    await expect(reset(handoff, 'compact')).resolves.toEqual({ kind: 'neutral' });
    expect(handoff.claims).toBe(0);
  });
  it('injects nothing without a pending handoff', async () => {
    await expect(reset(new FakeHandoff(false), 'new')).resolves.toEqual({ kind: 'neutral' });
  });
});

describe('handoff delivery boundaries (prd-14 NFR-05, DEC-03, TC-02)', () => {
  it('leaves the handoff untouched with automatic restart off (NFR-05)', async () => {
    const handoff = new FakeHandoff(true);
    await expect(reset(handoff, 'new', DEFAULT_CONFIG)).resolves.toEqual({ kind: 'neutral' });
    expect(handoff.claims).toBe(0);
  });
  it('keeps the resume command and leaves the handoff alone in snapshot mode', async () => {
    const handoff = new FakeHandoff(true);
    const config: ContextBrakeConfig = { ...HANDOFF_CONFIG, snapshot: { triggerZone: 'RED', command: '/sdd-snapshot', resumeCommand: '/sdd-orchestrate-flow' } };
    await expect(reset(handoff, 'new', config)).resolves.toEqual({ kind: 'context', block: '[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.' });
    expect(handoff.claims).toBe(0);
  });
  it('does not claim on a harness without session-start injection', async () => {
    const handoff = new FakeHandoff(true);
    const descriptor: RuntimeDescriptor = { ...DESCRIPTOR, capabilities: [] };
    await expect(handleSessionReset({ descriptor, config: HANDOFF_CONFIG, ledger, handoff }, { kind: 'session_reset', session: KEY, reason: 'new' })).resolves.toEqual({ kind: 'neutral' });
    expect(handoff.claims).toBe(0);
  });
});
