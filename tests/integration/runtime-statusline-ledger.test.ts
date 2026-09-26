import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const NOW = '2026-09-25T12:00:00.000Z';
const clock: Clock = { now: () => new Date(NOW) };
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };

describe('PRD 2.2 statusline ledger line (FR-03, DEC-04)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-statusline-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('appends a statusline line with the injected timestamp and reads it back', async () => {
    await ledger.appendStatuslineLine(KEY, { windowTokens: 1000000, inputTokens: 200000, usedPercentage: 20, model: 'claude-opus-5-5' });
    expect(await ledger.readLines(KEY)).toEqual([{ v: 1, type: 'statusline', at: NOW, windowTokens: 1000000, inputTokens: 200000, usedPercentage: 20, model: 'claude-opus-5-5' }]);
  });

  it('rejects a statusline line outside the schema without writing it', async () => {
    await expect(ledger.appendStatuslineLine(KEY, { windowTokens: 0, inputTokens: null, usedPercentage: null, model: null })).rejects.toThrow();
    expect(await ledger.readLines(KEY)).toEqual([]);
  });
});
