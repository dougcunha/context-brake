import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { runtimeDirectory, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

const NOW = '2026-09-15T12:00:00.000Z';
const clock: Clock = { now: () => new Date(NOW) };
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };

function toolInput(turn: number, toolUseId: string | null = `toolu_${turn}`): ToolLineInput {
  return { toolUseId, observedCharacters: 100 * turn, turn, usedTokens: 15000 + turn, windowTokens: 128000, estimatedTokens: 15000 + turn, source: 'estimated', zone: 'GREEN' };
}
function validToolJson(turn: number): string {
  return JSON.stringify({ v: 1, type: 'tool', at: NOW, toolUseId: null, observedCharacters: 10, turn, usedTokens: 10, windowTokens: 128000, estimatedTokens: 10, source: 'estimated', zone: 'GREEN' });
}

describe('T03 session ledger append (RF2, DEC-04)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-a-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('appends one LF-terminated valid JSON line per event with the injected timestamp', async () => {
    await ledger.appendSessionLine(KEY, { brakeMode: 'enforced', brakeReason: null });
    await ledger.appendToolLine(KEY, toolInput(1));
    await ledger.appendResetLine(KEY, 'compact');
    const content = await readFile(sessionLedgerPath(tempDir, KEY), 'utf8');
    expect(content.endsWith('\n')).toBe(true);
    expect(content.includes('\r')).toBe(false);
    expect(content.trimEnd().split('\n')).toHaveLength(3);
    const lines = await ledger.readLines(KEY);
    expect(lines.map((line) => line.type)).toEqual(['session', 'tool', 'reset']);
    expect(lines.every((line) => line.at === NOW)).toBe(true);
  });

  it('creates the runtime gitignore on the first write and never overwrites it', async () => {
    const gitignorePath = join(runtimeDirectory(tempDir), '.gitignore');
    await ledger.appendToolLine(KEY, toolInput(1));
    expect(await readFile(gitignorePath, 'utf8')).toBe('*\n');
    await writeFile(gitignorePath, '# user comment\n', 'utf8');
    await ledger.appendToolLine(KEY, toolInput(2));
    expect(await readFile(gitignorePath, 'utf8')).toBe('# user comment\n');
  });
});

describe('T03 session ledger tolerant read (RF2, DEC-04)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-read-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('skips corrupt, partial, and unknown-version lines and keeps the valid ones', async () => {
    await ledger.appendToolLine(KEY, toolInput(1));
    const filePath = sessionLedgerPath(tempDir, KEY);
    await appendFile(filePath, 'not json\n', 'utf8');
    await appendFile(filePath, `${JSON.stringify({ v: 2, type: 'tool', at: NOW })}\n`, 'utf8');
    await appendFile(filePath, validToolJson(2).slice(0, 40), 'utf8');
    const lines = await ledger.readLines(KEY);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.type).toBe('tool');
  });

  it('returns no lines for a session that never wrote a ledger', async () => {
    expect(await ledger.readLines({ ...KEY, sessionId: 'absent' })).toEqual([]);
  });
});

describe('T03 session isolation (RF4, CA-08)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-b-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('keeps a subagent on its own ledger and leaves the main session untouched', async () => {
    const subagent: SessionKey = { ...KEY, agentId: 'sub-1' };
    await ledger.appendToolLine(subagent, toolInput(1));
    await ledger.appendToolLine(KEY, toolInput(1));
    await ledger.appendToolLine(KEY, toolInput(2));
    expect(await ledger.readLines(subagent)).toHaveLength(1);
    expect(await ledger.readLines(KEY)).toHaveLength(2);
    expect(sessionLedgerPath(tempDir, subagent)).not.toBe(sessionLedgerPath(tempDir, KEY));
  });
});
