import { describe, expect, it } from 'vitest';
import type { ActiveSession } from '../../src/core/contracts/run-records.js';
import { SESSION_RESET_SIGNAL } from '../../src/core/services/reset-notice.js';
import { runSession, type SessionOutcome } from '../../src/core/services/run-session.js';
import { runContext } from '../helpers/run-fakes.js';
import { planWithStatuses } from '../helpers/run-plans.js';
import { RunWorld, signalEvents, type SessionScript } from '../helpers/run-world.js';
import type { RunnerConfiguration } from '../../src/core/contracts/runner-configuration.js';

type Started = { world: RunWorld; outcome: SessionOutcome; started: ActiveSession[] };

async function run(script: SessionScript, limits: Partial<RunnerConfiguration> = {}, runStartedAt?: Date): Promise<Started> {
  const world = new RunWorld(planWithStatuses(['IN_PROGRESS']));
  world.sessions = [script];
  const started: ActiveSession[] = [];
  const outcome = await runSession(runContext(world, limits), { prompt: 'PROMPT', runStartedAt: runStartedAt ?? world.now(), priorTokens: 0, onStarted: async (session) => { started.push(session); } });
  return { world, outcome, started };
}

describe('session end classification (RF3, DEC-05, TC-10)', () => {
  it('ends with reset_signal when the final text is the signal', async () => {
    const { world, outcome, started } = await run({ events: signalEvents('s-1', 4_200) });
    expect(outcome).toMatchObject({ endReason: 'reset_signal', sessionId: 's-1', tokens: { value: 4_200, source: 'measured' } });
    expect(started).toEqual([{ harness: 'claude-code', sessionId: 's-1', agentId: null }]);
    expect(world.launches[0]).toEqual({ command: { executable: 'claude', args: ['-p'], stdin: 'PROMPT' }, environment: { CONTEXT_BRAKE_RUN_ID: 'run-1' } });
  });
  it('ends with reset_signal when the signal ends the last line (TC-10)', async () => {
    const { outcome } = await run({ events: [{ kind: 'started', sessionId: 's-1' }, { kind: 'final_text', text: `Done.\n\n${SESSION_RESET_SIGNAL}` }] });
    expect(outcome.endReason).toBe('reset_signal');
  });
  it('treats a signal before later text as a plain harness exit', async () => {
    const { outcome } = await run({ events: [{ kind: 'started', sessionId: 's-1' }, { kind: 'final_text', text: `${SESSION_RESET_SIGNAL}\nMore text` }] });
    expect(outcome.endReason).toBe('harness_exit');
  });
});

describe('session errors and signal grace (RF3, DEC-05, TC-10)', () => {
  it('uses the final ledger zone and token estimate after harness exit (DEC-06, CR-04)', async () => {
    const { outcome } = await run({ events: [{ kind: 'started', sessionId: 's-1' }], finalReading: { zone: 'YELLOW', tokens: { value: 42_000, source: 'estimated' } } });
    expect(outcome).toMatchObject({ finalZone: 'YELLOW', tokens: { value: 42_000, source: 'estimated' } });
  });
  it('carries the process stream parse count into the session outcome (CR-03)', async () => {
    const { outcome } = await run({ events: signalEvents('s-1'), unparsedLines: 3 });
    expect(outcome.streamParseErrors).toBe(3);
  });
  it('records zero parse errors when the harness never spawned (CR-03)', async () => {
    const { outcome } = await run({ spawnFailed: true, unparsedLines: 3 });
    expect(outcome.streamParseErrors).toBe(0);
  });
  it('reports harness_error with a 200-character detail on a non-zero exit', async () => {
    const { outcome } = await run({ events: [{ kind: 'final_text', text: 'x'.repeat(300) }], exitCode: 1 });
    expect(outcome).toMatchObject({ endReason: 'harness_error', sessionId: null, finalZone: null, tokens: { value: 0, source: 'estimated' } });
    expect(outcome.harnessDetail).toHaveLength(200);
  });
  it.each<[string, SessionScript]>([
    ['a failed stream event', { events: [{ kind: 'failed', detail: 'auth expired' }] }],
    ['a spawn failure', { spawnFailed: true }],
  ])('reports harness_error for %s', async (_label, script) => expect((await run(script)).outcome.endReason).toBe('harness_error'));
  it('kills a process that stays alive 10 s after the signal and keeps reset_signal', async () => {
    const { world, outcome } = await run({ events: signalEvents('s-1'), hang: true });
    expect(outcome.endReason).toBe('reset_signal');
    expect(outcome.endedAt.getTime() - outcome.startedAt.getTime()).toBe(10_000);
    expect(world.stops).toBe(1);
  });
});

describe('in-session stops (RF3, RF7, DEC-06, DEC-09, TC-05, TC-10)', () => {
  it('ends with critical_ceiling exactly after the critical grace period', async () => {
    const { world, outcome } = await run({ events: [{ kind: 'started', sessionId: 's-1' }], zone: 'CRITICAL', hang: true }, { criticalGraceSeconds: 120 });
    expect(outcome).toMatchObject({ endReason: 'critical_ceiling', finalZone: 'CRITICAL', tokens: { value: 90_000, source: 'estimated' } });
    expect(outcome.endedAt.getTime() - outcome.startedAt.getTime()).toBe(120_000);
    expect(world.stops).toBe(1);
  });
  it('ends with session_timeout at the per-session deadline', async () => {
    const { outcome } = await run({ hang: true }, { maxSessionMinutes: 2, maxTotalMinutes: 60 });
    expect(outcome.endReason).toBe('session_timeout');
    expect(outcome.endedAt.getTime() - outcome.startedAt.getTime()).toBe(120_000);
  });
  it('ends with run_timeout when the run deadline comes first', async () => {
    const world = new RunWorld(null);
    const { outcome } = await run({ hang: true }, { maxSessionMinutes: 30, maxTotalMinutes: 31 }, new Date(world.nowMs - 30 * 60_000));
    expect(outcome.endReason).toBe('run_timeout');
    expect(outcome.endedAt.getTime() - outcome.startedAt.getTime()).toBe(60_000);
  });
  it('ends with token_limit when the run total reaches the ceiling', async () => {
    const { outcome } = await run({ events: [{ kind: 'started', sessionId: 's-1' }, { kind: 'usage', tokens: 5_000 }], hang: true }, { maxTotalTokens: 5_000 });
    expect(outcome.endReason).toBe('token_limit');
  });
});

describe('interrupt during a session (RF12, DEC-12)', () => {
  it('stops the harness and ends with interrupted', async () => {
    const world = new RunWorld(planWithStatuses(['IN_PROGRESS']));
    world.sessions = [{ agent: (current) => { current.interruptRequested = true; }, hang: true }];
    const outcome = await runSession(runContext(world), { prompt: 'PROMPT', runStartedAt: world.now(), priorTokens: 0, onStarted: async () => undefined });
    expect(outcome.endReason).toBe('interrupted');
    expect(world.stops).toBe(1);
  });
});
