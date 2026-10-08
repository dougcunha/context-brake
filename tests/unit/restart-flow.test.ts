import { describe, expect, it } from 'vitest';
import type { RestartReasonCode } from '../../src/core/contracts/auto-restart.js';
import { IDLE_GUARD_STATE, type GuardState, type OpenSessionRequest, type RestartHost, type StandDownFacts } from '../../src/core/contracts/restart-host.js';
import { seedText } from '../../src/core/services/auto-restart-notices.js';
import { handleTurnEnd, type RestartSettings } from '../../src/core/services/restart-flow.js';

const MARKER_REPLY = 'Handoff saved.\n[REQUEST_SESSION_RESET]';
const SNAPSHOT: RestartSettings = { maxConsecutive: 2, mode: 'snapshot' };
const HANDOFF: RestartSettings = { maxConsecutive: 2, mode: 'handoff' };
const RESUME = '[ContextBrake resume v1] Read ".context-brake/handoffs/x.md" and continue the previous work from it.';

type FakeOptions = { readonly guards?: GuardState; readonly writtenAt?: number | null; readonly resume?: string | null; readonly standDown?: StandDownFacts };

class FakeHost implements RestartHost {
  state: GuardState;
  readonly codes: RestartReasonCode[] = [];
  readonly notices: string[] = [];
  readonly requests: OpenSessionRequest[] = [];
  readonly guards = { read: async (): Promise<GuardState> => this.state, write: async (state: GuardState): Promise<void> => { this.state = state; } };
  readonly handoff: { pendingSince(): Promise<number | null> };
  constructor(private readonly options: FakeOptions = {}) {
    this.state = options.guards ?? IDLE_GUARD_STATE;
    this.handoff = { pendingSince: async () => options.writtenAt ?? null };
  }
  async standDown(): Promise<StandDownFacts> { return this.options.standDown ?? { disabledByEnv: false, interactive: true }; }
  turnStartedAt(): number | undefined { return 100; }
  async resumeForSeed(): Promise<string | null> { return this.options.resume ?? null; }
  openSession(request: OpenSessionRequest): void { this.requests.push(request); }
  async log(code: RestartReasonCode): Promise<void> { this.codes.push(code); }
  notify(text: string): void { this.notices.push(text); }
}

describe('neutral restart flow (prd-14 FR-05, FR-09, NFR-01, TC-05)', () => {
  it('ignores a reply that does not end with the marker', async () => {
    const host = new FakeHost();
    await handleTurnEnd(host, { text: 'still working', settings: SNAPSHOT });
    expect(host.codes).toEqual([]);
    expect(host.requests).toEqual([]);
  });
  it('bumps the guard, logs the restart, and opens a session with the generic seed', async () => {
    const host = new FakeHost();
    await handleTurnEnd(host, { text: MARKER_REPLY, settings: SNAPSHOT });
    expect(host.codes).toEqual(['RESTARTED']);
    expect(host.state.consecutive).toBe(1);
    expect(host.requests.map((request) => request.seed)).toEqual([seedText()]);
    await host.requests[0]!.onOpened();
    expect(host.state.toolCallsSinceSeed).toBe(0);
  });
  it('carries the resume text in the seed on a harness without session-start injection', async () => {
    const host = new FakeHost({ resume: RESUME, writtenAt: 150 });
    await handleTurnEnd(host, { text: MARKER_REPLY, settings: HANDOFF });
    expect(host.requests[0]!.seed).toBe(`${seedText()}\n\n${RESUME}`);
  });
});

describe('neutral restart flow failures and skips (prd-14 FR-04, FR-09, NFR-01, TC-05)', () => {
  it('rolls the guard back and reports when the harness rejects the new session', async () => {
    const host = new FakeHost();
    await handleTurnEnd(host, { text: MARKER_REPLY, settings: SNAPSHOT });
    await host.requests[0]!.onRejected();
    expect(host.state.consecutive).toBe(0);
    expect(host.codes).toEqual(['RESTARTED', 'ERROR_RESTART_REJECTED']);
    expect(host.notices.at(-1)).toContain('the harness rejected the new session');
  });
  it('skips with a reason and opens nothing when the handoff is missing (FR-04)', async () => {
    const host = new FakeHost({ writtenAt: null });
    await handleTurnEnd(host, { text: MARKER_REPLY, settings: HANDOFF });
    expect(host.codes).toEqual(['SKIP_HANDOFF_MISSING']);
    expect(host.requests).toEqual([]);
  });
  it('stops at the consecutive limit', async () => {
    const host = new FakeHost({ guards: { consecutive: 2, toolCallsSinceSeed: 4 } });
    await handleTurnEnd(host, { text: MARKER_REPLY, settings: SNAPSHOT });
    expect(host.codes).toEqual(['PAUSED_LOOP_GUARD']);
  });
  it('reports an internal error when logging fails, without throwing', async () => {
    const host = new FakeHost();
    host.log = async () => { throw new Error('disk full'); };
    await expect(handleTurnEnd(host, { text: MARKER_REPLY, settings: SNAPSHOT })).resolves.toBeUndefined();
    expect(host.notices).toContain('ContextBrake: automatic restart skipped: an internal error occurred. This session keeps running.');
  });
});
