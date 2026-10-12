import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contextReadingRelativePath } from '../../src/core/contracts/context-reading.js';
import type { ToolLine } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { readContextReading } from '../../src/infrastructure/harnesses/claude-code/mod-reading.js';
import { applyEnvironment } from '../helpers/environment-overrides.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { runHookInProcess } from '../helpers/in-process-hook.js';

const TRANSCRIPT = resolve('tests/fixtures/harnesses/claude-code/transcript-main.jsonl');
const SESSION = 'session-claude-1';
const KEY = { harness: 'claude-code', sessionId: SESSION, agentId: null } as const;
const CLOCK = { now: (): Date => new Date() };
const READING = { v: 1, at: '2026-10-11T10:00:00.000Z', windowTokens: 1_000_000, inputTokens: 54_452, usedPercentage: 5 };
let root: string;
let restoreEnvironment: () => void;

async function writeReading(content: string): Promise<void> {
  const path = join(root, contextReadingRelativePath('claude-code', SESSION));
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

async function toolLine(overrides: Record<string, unknown>): Promise<Partial<ToolLine> | undefined> {
  const base = await loadHarnessPayload('claude-code', 'post-tool-use.json') as Record<string, unknown>;
  const payload = { ...base, session_id: SESSION, ...overrides };
  await runHookInProcess({ harness: 'claude-code', projectRoot: root, event: 'PostToolUse', payload });
  const lines = await new NodeSessionLedger(root, CLOCK).readLines(KEY);
  return lines.find((line): line is ToolLine => line.type === 'tool');
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-hook-reading-'));
  restoreEnvironment = applyEnvironment({ CLAUDE_PROJECT_DIR: root });
});
afterEach(async () => {
  restoreEnvironment();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('PostToolUse hook with the mod reading (FR-02, D-06, TC-04, TC-14)', () => {
  it('reports the fresher mod reading with the harness window', async () => {
    await writeReading(JSON.stringify(READING));
    expect(await toolLine({ transcript_path: TRANSCRIPT })).toMatchObject({ source: 'measured', usedTokens: 54_452, windowTokens: 1_000_000, windowOrigin: 'harness' });
  });

  it('keeps the transcript tokens when the transcript is fresher and takes the window from the reading', async () => {
    await writeReading(JSON.stringify({ ...READING, at: '2020-01-01T00:00:00.000Z' }));
    expect(await toolLine({ transcript_path: TRANSCRIPT })).toMatchObject({ source: 'measured', usedTokens: 194_431, windowTokens: 1_000_000, windowOrigin: 'harness' });
  });

  it('falls back to the bridge ledger line when no reading file exists', async () => {
    await new NodeSessionLedger(root, CLOCK).appendStatuslineLine(KEY, { windowTokens: 1_000_000, inputTokens: 40_000, usedPercentage: 4, model: null });
    expect(await toolLine({})).toMatchObject({ source: 'measured', usedTokens: 40_000, windowTokens: 1_000_000, windowOrigin: 'harness' });
  });

  it('falls back to the transcript without an exception when the reading cannot be read', async () => {
    await mkdir(join(root, contextReadingRelativePath('claude-code', SESSION)), { recursive: true });
    expect(await toolLine({ transcript_path: TRANSCRIPT })).toMatchObject({ source: 'measured', usedTokens: 194_431, windowOrigin: 'config' });
  });
});

describe('reading file validation (NFR-01, TC-11)', () => {
  it.each([
    ['empty', ''],
    ['truncated', '{"v":1,"at":"2026-10-11T10:00:00.000Z","windowTo'],
    ['not an object', 'null'],
    ['another version', JSON.stringify({ ...READING, v: 2 })],
    ['carrying an extra field', JSON.stringify({ ...READING, prompt: 'text' })],
    ['oversized', ' '.repeat(2000) + JSON.stringify(READING)],
  ])('treats a %s file as no reading', async (_label, content) => {
    await writeReading(content);
    expect(await readContextReading(SESSION)).toBeNull();
  });

  it('reads a valid file and ignores a session id that is not a file name', async () => {
    await writeReading(JSON.stringify(READING));
    expect(await readContextReading(SESSION)).toEqual(READING);
    expect(await readContextReading('../outside')).toBeNull();
    expect(await readContextReading(undefined)).toBeNull();
  });
});
