import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LedgerReading } from '../../src/core/contracts/run-ports.js';
import type { ActiveSession } from '../../src/core/contracts/run-records.js';
import type { SessionLedger, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeLedgerWatcher } from '../../src/infrastructure/runner/node-ledger-watcher.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const SESSION: ActiveSession = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const POLL_MS = 20;
const clock = { now: () => new Date('2026-09-23T12:00:00.000Z') };

function toolLine(turn: number, zone: ToolLineInput['zone'], usedTokens: number): ToolLineInput {
  return { toolUseId: `toolu_${turn}`, observedCharacters: 100, turn, usedTokens, windowTokens: 128000, estimatedTokens: usedTokens, source: 'estimated', zone };
}

let projectRoot: string;
beforeEach(async () => { projectRoot = await mkdtemp(join(tmpdir(), 'cb-t06-watcher-')); });
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('ledger watcher (TC-10, RF3, DEC-06)', () => {
  it('reports no zone or tokens before the hook writes a tool line', async () => {
    const watch = new NodeLedgerWatcher(new NodeSessionLedger(projectRoot, clock), POLL_MS).watch(SESSION, () => undefined);
    await delay(POLL_MS * 3);
    expect(watch.latest()).toEqual({ zone: null, tokens: null });
    await watch.stop();
  });

  it('follows the latest tool line of the session ledger', async () => {
    const ledger = new NodeSessionLedger(projectRoot, clock);
    const readings: LedgerReading[] = [];
    const watch = new NodeLedgerWatcher(ledger, POLL_MS).watch(SESSION, (reading) => readings.push(reading));
    await ledger.appendToolLine(SESSION, toolLine(1, 'GREEN', 20000));
    await ledger.appendToolLine(SESSION, toolLine(2, 'CRITICAL', 99000));
    await delay(POLL_MS * 5);
    await watch.stop();
    expect(watch.latest()).toEqual({ zone: 'CRITICAL', tokens: { value: 99000, source: 'estimated' } });
    expect(readings.at(-1)).toEqual(watch.latest());
  });
});

describe('ledger watcher final reading (DEC-06, RF17, CR-04)', () => {
  it('reads a hook line written after the last poll when the session ends', async () => {
    const ledger = new NodeSessionLedger(projectRoot, clock);
    const readings: LedgerReading[] = [];
    const watch = new NodeLedgerWatcher(ledger, 60_000).watch(SESSION, (reading) => readings.push(reading));
    await vi.waitFor(() => expect(readings).toHaveLength(1));
    await ledger.appendToolLine(SESSION, toolLine(1, 'YELLOW', 70000));
    expect(watch.latest().zone).toBeNull();
    expect(await watch.stop()).toEqual({ zone: 'YELLOW', tokens: { value: 70000, source: 'estimated' } });
    expect(readings.at(-1)).toEqual(watch.latest());
  });
});

describe('ledger watcher lifecycle (DEC-06)', () => {
  it('stops polling once stopped', async () => {
    const ledger = new NodeSessionLedger(projectRoot, clock);
    const watch = new NodeLedgerWatcher(ledger, POLL_MS).watch(SESSION, () => undefined);
    await delay(POLL_MS * 2);
    await watch.stop();
    await ledger.appendToolLine(SESSION, toolLine(1, 'RED', 80000));
    await delay(POLL_MS * 4);
    expect(watch.latest().zone).toBeNull();
  });

  it('keeps the last reading when the ledger cannot be read', async () => {
    let fail = false;
    const ledger = new NodeSessionLedger(projectRoot, clock);
    const flaky: SessionLedger = { ...ledger, pruneStaleSessions: async () => 0, appendSessionLine: async () => undefined, appendToolLine: async () => undefined, appendResetLine: async () => undefined, readLines: async (key) => { if (fail) throw new Error('locked'); return ledger.readLines(key); } };
    await ledger.appendToolLine(SESSION, toolLine(1, 'YELLOW', 70000));
    const watch = new NodeLedgerWatcher(flaky, POLL_MS).watch(SESSION, () => undefined);
    await delay(POLL_MS * 3);
    fail = true;
    await delay(POLL_MS * 3);
    expect(await watch.stop()).toEqual({ zone: 'YELLOW', tokens: { value: 70000, source: 'estimated' } });
    expect(watch.latest().zone).toBe('YELLOW');
  });
});
