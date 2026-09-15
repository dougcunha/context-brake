import { mkdtemp, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeBlockLog } from '../../src/infrastructure/runtime/node-runtime-logs.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { runtimeDirectory, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

const NOW = new Date('2026-09-15T00:00:00.000Z');
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const clock: Clock = { now: () => NOW };

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

  it('prunes only the ledgers untouched for more than fourteen days', async () => {
    const stale: SessionKey = { harness: 'claude-code', sessionId: 'stale', agentId: null };
    const fresh: SessionKey = { harness: 'claude-code', sessionId: 'fresh', agentId: null };
    const staleDate = new Date(NOW.getTime() - 15 * MILLISECONDS_PER_DAY);
    const freshDate = new Date(NOW.getTime() - 13 * MILLISECONDS_PER_DAY);
    await ledger.appendToolLine(stale, toolInput(1));
    await ledger.appendToolLine(fresh, toolInput(1));
    const blocks = new NodeBlockLog(tempDir, clock);
    await blocks.append(stale, { tool: 'Read', zone: 'CRITICAL', turn: 12, percentage: 75, source: 'estimated', reason: 'critical_ceiling' });
    await utimes(sessionLedgerPath(tempDir, stale), staleDate, staleDate);
    await utimes(sessionLedgerPath(tempDir, fresh), freshDate, freshDate);
    await utimes(join(runtimeDirectory(tempDir), 'blocks.jsonl'), staleDate, staleDate);
    expect(await ledger.pruneStaleSessions()).toBe(1);
    expect(await exists(sessionLedgerPath(tempDir, stale))).toBe(false);
    expect(await exists(sessionLedgerPath(tempDir, fresh))).toBe(true);
    expect(await exists(join(runtimeDirectory(tempDir), 'blocks.jsonl'))).toBe(true);
  });
});

describe('T03 keeps fresh ledgers and the runtime gitignore (DEC-16)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-fresh-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('removes nothing when every ledger was touched within the retention window', async () => {
    const key: SessionKey = { harness: 'claude-code', sessionId: 'kept', agentId: null };
    await ledger.appendToolLine(key, toolInput(1));
    expect(await ledger.pruneStaleSessions()).toBe(0);
    expect(await readFile(join(runtimeDirectory(tempDir), '.gitignore'), 'utf8')).toBe('*\n');
    expect(await exists(sessionLedgerPath(tempDir, key))).toBe(true);
  });
});
