import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { nextTurn, summarizeLedger } from '../../src/core/services/session-counters.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };
const SESSIONS = 20;

function toolInput(turn: number, toolUseId: string): ToolLineInput {
  return { toolUseId, observedCharacters: 120, turn, usedTokens: 16000, windowTokens: 128000, estimatedTokens: 16000, source: 'estimated', zone: 'GREEN' };
}

describe('T03 concurrent appends (RF1, RF2, CA-06, TC-08)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-parallel-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('keeps one valid line per concurrent append and reports the fourth turn on the isolated read', async () => {
    for (let index = 0; index < SESSIONS; index += 1) {
      const key: SessionKey = { harness: 'claude-code', sessionId: `session-${index}`, agentId: null };
      await Promise.all([1, 2, 3].map((turn) => ledger.appendToolLine(key, toolInput(turn, `toolu-${index}-${turn}`))));
      const burst = summarizeLedger(await ledger.readLines(key));
      expect(burst.turns, `session-${index} burst`).toBe(3);
      await ledger.appendToolLine(key, toolInput(nextTurn(burst), `toolu-${index}-4`));
      const tools = (await ledger.readLines(key)).filter((line) => line.type === 'tool');
      expect(tools, `session-${index} total`).toHaveLength(4);
      expect(tools.at(-1)?.turn, `session-${index} reported turn`).toBe(4);
      expect(summarizeLedger(tools).turns, `session-${index} final count`).toBe(4);
    }
  });
});
