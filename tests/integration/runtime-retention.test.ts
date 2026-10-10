import { mkdtemp, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

const NOW = new Date('2026-09-15T00:00:00.000Z');
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const clock: Clock = { now: () => NOW };
const LEDGER_AGES: readonly (readonly [string, number])[] = [['stale', 15], ['exactly-fourteen-days', 14], ['fresh', 13]];

function toolInput(turn: number): ToolLineInput {
  return { toolUseId: `toolu_${turn}`, observedCharacters: 10, turn, usedTokens: 10, windowTokens: 128000, estimatedTokens: 10, source: 'estimated', zone: 'GREEN' };
}
async function exists(filePath: string): Promise<boolean> {
  return stat(filePath).then(() => true).catch(() => false);
}

describe('T03 prunes stale ledgers (DEC-16, TC-29)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-retention-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('prunes only the ledgers untouched for more than fourteen days and keeps one touched exactly fourteen days ago', async () => {
    const keys = LEDGER_AGES.map(([sessionId]): SessionKey => ({ harness: 'claude-code', sessionId, agentId: null }));
    for (const [index, [, days]] of LEDGER_AGES.entries()) {
      const touched = new Date(NOW.getTime() - days * MILLISECONDS_PER_DAY);
      await ledger.appendToolLine(keys[index]!, toolInput(1));
      await utimes(sessionLedgerPath(tempDir, keys[index]!), touched, touched);
    }
    expect(await ledger.pruneStaleSessions()).toBe(1);
    expect(await Promise.all(keys.map((key) => exists(sessionLedgerPath(tempDir, key))))).toEqual([false, true, true]);
  });
});
