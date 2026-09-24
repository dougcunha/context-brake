import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ActiveSession } from '../../src/core/contracts/run-records.js';
import type { LedgerReading } from '../../src/core/contracts/run-ports.js';
import { NodeLedgerWatcher } from '../../src/infrastructure/runner/node-ledger-watcher.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const SESSION: ActiveSession = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const clock = { now: () => new Date('2026-09-23T12:00:00.000Z') };

describe('ledger watcher finish race (DEC-06, CR-04)', () => {
  it('discards an in-flight stale poll before applying the final read', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cb-ledger-finish-'));
    try {
      const ledger = new NodeSessionLedger(root, clock);
      await ledger.appendToolLine(SESSION, { toolUseId: 'toolu_1', observedCharacters: 100, turn: 1, usedTokens: 70000, windowTokens: 128000, estimatedTokens: 70000, source: 'estimated', zone: 'YELLOW' });
      const gate: { release?: () => void } = {};
      const pending = new Promise<void>((resolve) => { gate.release = resolve; });
      let reads = 0;
      const source = { readLines: async (session: ActiveSession) => {
        reads += 1;
        if (reads === 1) { await pending; return []; }
        return ledger.readLines(session);
      } };
      const seen: LedgerReading[] = [];
      const watch = new NodeLedgerWatcher(source, 60_000).watch(SESSION, (reading) => seen.push(reading));
      const finished = watch.stop();
      gate.release?.();
      const expected = { zone: 'YELLOW', tokens: { value: 70000, source: 'estimated' } };
      expect(await finished).toEqual(expected);
      expect(await watch.stop()).toEqual(expected);
      expect(reads).toBe(2);
      expect(seen).toEqual([expected]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
