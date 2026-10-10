import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { HandoffStore } from '../../src/core/contracts/handoff.js';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import type { ClaimDeadline } from '../../src/core/contracts/hook-phase.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { ResetReason, SessionLedger } from '../../src/core/contracts/session-ledger.js';
import { handleSessionReset } from '../../src/core/services/session-reset-handler.js';

const KEY: SessionKey = { harness: 'codex-cli', sessionId: 'session-1', agentId: null };
const ARCHIVED = '.context-brake/handoffs/20261007T120000.000Z.md';
const DESCRIPTOR: RuntimeDescriptor = { harness: 'codex-cli', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/new' };
const HANDOFF_CONFIG: ContextBrakeConfig = { ...DEFAULT_CONFIG, autoRestart: { maxConsecutiveRestarts: 2 } };
const SNAPSHOT_CONFIG: ContextBrakeConfig = { ...HANDOFF_CONFIG, snapshot: { triggerZone: 'RED', command: '/sdd-snapshot', resumeCommand: '/sdd-orchestrate-flow' } };
const RESUME = `[ContextBrake resume v1] Read "${ARCHIVED}" and continue the previous work from it.`;
const RUN_RESUME = { kind: 'context', block: '[ContextBrake resume v1] Run "/sdd-orchestrate-flow" before continuing.' };

class FakeHandoff implements HandoffStore {
  claims = 0;
  claimDeadline: ClaimDeadline | undefined;
  constructor(private pending: boolean) {}
  async pendingSince(): Promise<number | null> { return this.pending ? 1 : null; }
  async claim(deadline?: ClaimDeadline): Promise<string | null> {
    this.claims += 1;
    this.claimDeadline = deadline;
    return this.pending ? ARCHIVED : null;
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

type ResetCase = { readonly reason: ResetReason; readonly config?: ContextBrakeConfig; readonly descriptor?: RuntimeDescriptor };

function reset(handoff: FakeHandoff, input: ResetCase, deadline?: ClaimDeadline): Promise<unknown> {
  const options = { descriptor: input.descriptor ?? DESCRIPTOR, config: input.config ?? HANDOFF_CONFIG, ledger, handoff };
  return handleSessionReset(options, { kind: 'session_reset', session: KEY, reason: input.reason }, { deadline });
}
function harness(id: HarnessId): RuntimeDescriptor {
  return { ...DESCRIPTOR, harness: id };
}

describe('handoff delivery at session start (prd-14 FR-02, FR-03, TC-02)', () => {
  it.each<ResetReason>(['new', 'clear'])('claims a pending handoff on %s and names the archived path', async (reason) => {
    await expect(reset(new FakeHandoff(true), { reason })).resolves.toEqual({ kind: 'context', block: RESUME });
  });
  it('passes the hook deadline to the claim (codereview_03 CR-01, codereview_05 CR-01)', async () => {
    const handoff = new FakeHandoff(true);
    const deadline: ClaimDeadline = { isExpired: () => false, commit: () => true };
    await reset(handoff, { reason: 'new' }, deadline);
    expect(handoff.claimDeadline).toBe(deadline);
  });
  it('injects nothing without a pending handoff', async () => {
    await expect(reset(new FakeHandoff(false), { reason: 'new' })).resolves.toEqual({ kind: 'neutral' });
  });
});

describe('handoff delivery boundaries (prd-14 NFR-05, DEC-03, TC-02)', () => {
  it.each<[string, ResetCase]>([
    ['on compaction (TC-02)', { reason: 'compact' }],
    ['with automatic restart off (NFR-05)', { reason: 'new', config: DEFAULT_CONFIG }],
    ['on a harness without session-start injection', { reason: 'new', descriptor: { ...DESCRIPTOR, capabilities: [] } }],
  ])('neither claims nor injects %s', async (_case, input) => {
    const handoff = new FakeHandoff(true);
    await expect(reset(handoff, input)).resolves.toEqual({ kind: 'neutral' });
    expect(handoff.claims).toBe(0);
  });
  it.each<[ResetReason, HarnessId, unknown]>([
    ['new', 'codex-cli', RUN_RESUME],
    ['compact', 'codex-cli', RUN_RESUME],
    ['compact', 'cursor', { kind: 'neutral' }],
  ])('in snapshot mode answers %s on %s with %j and leaves the handoff alone (prd-12 FR-05)', async (reason, id, decision) => {
    const handoff = new FakeHandoff(true);
    await expect(reset(handoff, { reason, config: SNAPSHOT_CONFIG, descriptor: harness(id) })).resolves.toEqual(decision);
    expect(handoff.claims).toBe(0);
  });
});
