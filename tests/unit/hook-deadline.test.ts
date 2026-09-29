import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { HookPhase } from '../../src/core/contracts/hook-phase.js';
import type { RuntimeDescriptor, SessionKey } from '../../src/core/contracts/runtime.js';
import type { LedgerLine, SessionLedger } from '../../src/core/contracts/session-ledger.js';
import type { BootDecision } from '../../src/core/services/boot-policy.js';
import { DeadlineExceededError } from '../../src/core/services/failure-policy.js';
import { handleSessionReset } from '../../src/core/services/session-reset-handler.js';
import { deadlineFor, deadlineTiming, HookDeadline } from '../../src/infrastructure/runtime/hook-deadline.js';

const KEY: SessionKey = { harness: 'claude-code', sessionId: 'phase-session', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const LIMITS = { event: 1500, sessionStart: 5000 };

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
}
function recordingLedger(phases: HookPhase[], mark: (phase: HookPhase) => void): SessionLedger {
  const lines: LedgerLine[] = [];
  return {
    readLines: async () => lines,
    appendSessionLine: async () => undefined,
    appendToolLine: async () => undefined,
    appendResetLine: async () => { phases.push('ledger'); },
    appendStatuslineLine: async () => undefined,
    pruneStaleSessions: async () => { mark('prune'); return 0; },
  };
}
async function slowGitBoot(onPhase?: (phase: HookPhase) => void): Promise<BootDecision> {
  onPhase?.('boot_files');
  onPhase?.('boot_git');
  await sleep(200);
  return { kind: 'none' };
}

describe('hook deadline selection (FR-10, DEC-11, TC-15)', () => {
  it('gives session reset the session-start limit and every other event the event limit', () => {
    expect(deadlineFor({ kind: 'session_reset', session: KEY, reason: 'new' }, LIMITS)).toBe(5000);
    expect(deadlineFor({ kind: 'pre_invocation', session: KEY }, LIMITS)).toBe(1500);
    expect(deadlineFor(null, LIMITS)).toBe(1500);
  });
  it('measures an extension from the hook start', async () => {
    const deadline = new HookDeadline(20, 'event');
    await sleep(15);
    deadline.extendTo(40);
    await expect(deadline.run(sleep(60))).rejects.toBeInstanceOf(DeadlineExceededError);
  });
  it('resolves work that finishes in time and ignores extensions after it', async () => {
    const deadline = new HookDeadline(50, 'engine');
    expect(await deadline.run(Promise.resolve('done'))).toBe('done');
    expect(() => { deadline.extendTo(10); }).not.toThrow();
  });
});

describe('session reset phases (FR-11, DEC-12, TC-16)', () => {
  it('reports the git step of the boot when the deadline elapses there', async () => {
    const deadline = new HookDeadline(80, 'engine');
    const phases: HookPhase[] = [];
    const options = { descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, ledger: recordingLedger(phases, deadline.mark), readValidationCommand: async () => null, readBoot: slowGitBoot, planPresence: { exists: async () => true } };
    const error: unknown = await deadline.run(handleSessionReset(options, { kind: 'session_reset', session: KEY, reason: 'new' }, deadline.mark)).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(DeadlineExceededError);
    expect(deadlineTiming(error)).toMatchObject({ phase: 'boot_git' });
    expect(deadlineTiming(error)?.elapsedMs).toBeGreaterThanOrEqual(75);
    expect(phases).toEqual(['ledger']);
  });
  it('has no timing for other failures', () => {
    expect(deadlineTiming(new Error('other'))).toBeUndefined();
  });
});
