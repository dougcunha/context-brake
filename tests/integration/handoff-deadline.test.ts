import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { ClaimDeadline } from '../../src/core/contracts/hook-phase.js';
import type { RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import type { SessionLedger } from '../../src/core/contracts/session-ledger.js';
import { DeadlineExceededError } from '../../src/core/services/failure-policy.js';
import { handleSessionReset } from '../../src/core/services/session-reset-handler.js';
import { HookDeadline } from '../../src/infrastructure/runtime/hook-deadline.js';
import { NodeHandoffStore } from '../../src/infrastructure/storage/node-handoff-store.js';

const KEY: SessionKey = { harness: 'codex-cli', sessionId: 'deadline-session', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'codex-cli', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/new' };
const HANDOFF_CONFIG = { ...DEFAULT_CONFIG, autoRestart: { maxConsecutiveRestarts: 2 } };
const START: RuntimeEvent & { kind: 'session_reset' } = { kind: 'session_reset', session: KEY, reason: 'new' };
const AT = new Date('2026-10-07T12:00:00.000Z');
const DEADLINE_MS = 40;
const SLOW_MS = 150;

function ledgerTaking(milliseconds: number): SessionLedger {
  return {
    readLines: async () => [],
    appendSessionLine: async () => undefined,
    appendToolLine: async () => undefined,
    appendResetLine: async () => { if (milliseconds > 0) await new Promise((resolve) => { setTimeout(resolve, milliseconds); }); },
    appendStatuslineLine: async () => undefined,
    pruneStaleSessions: async () => 0,
  };
}
function elapsingAfterSecondCheck(deadline: HookDeadline): ClaimDeadline {
  let checks = 0;
  function elapseAfter(result: boolean): boolean {
    checks += 1;
    if (checks === 2) vi.advanceTimersByTime(DEADLINE_MS * 10);
    return result;
  }
  return { isExpired: () => elapseAfter(deadline.isExpired()), commit: () => elapseAfter(deadline.commit()) };
}

let root: string;
let pending: string;
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  root = await mkdtemp(join(tmpdir(), 'cb-handoff-deadline-'));
  pending = join(root, '.context-brake', 'handoff.md');
  await mkdir(join(root, '.context-brake'), { recursive: true });
  await writeFile(pending, '# goal\n', 'utf8');
});
afterEach(async () => {
  vi.useRealTimers();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('session start past its deadline keeps the handoff (prd-14 FR-03, codereview_03 CR-01)', () => {
  it('answers through the deadline in the ledger phase and leaves the handoff pending for the next session', async () => {
    const deadline = new HookDeadline(DEADLINE_MS, 'engine');
    const handoff = new NodeHandoffStore(root, { now: () => AT });
    const work = handleSessionReset({ descriptor: DESCRIPTOR, config: HANDOFF_CONFIG, ledger: ledgerTaking(SLOW_MS), handoff }, START, { onPhase: deadline.mark, deadline });
    const answer = deadline.run(work).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(SLOW_MS);
    const error = await answer;
    expect(error).toBeInstanceOf(DeadlineExceededError);
    expect(error).toMatchObject({ phase: 'ledger' });
    await expect(work).resolves.toEqual({ kind: 'neutral' });
    await expect(readFile(pending, 'utf8')).resolves.toBe('# goal\n');
  });
});

describe('a committed claim outlives the deadline (prd-14 FR-02, FR-03, codereview_05 CR-01)', () => {
  it('delivers the resume text when the deadline elapses after the commit, during the prune and the lock release', async () => {
    const deadline = new HookDeadline(DEADLINE_MS, 'engine');
    const handoff = new NodeHandoffStore(root, { now: () => AT });
    const work = handleSessionReset({ descriptor: DESCRIPTOR, config: HANDOFF_CONFIG, ledger: ledgerTaking(0), handoff }, START, { deadline: elapsingAfterSecondCheck(deadline) });
    await expect(deadline.run(work)).resolves.toEqual({ kind: 'context', block: expect.stringContaining('.context-brake/handoffs/20261007T120000.000Z.md') });
    await expect(readFile(join(root, '.context-brake', 'handoffs', '20261007T120000.000Z.md'), 'utf8')).resolves.toBe('# goal\n');
  });
});
