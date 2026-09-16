import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ToolLine } from '../../src/core/contracts/session-ledger.js';
import { createOmpExtension, type OmpApi } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { fixedClock, writeRuntimeConfig } from '../helpers/runtime-seed.js';

const KEY: SessionKey = { harness: 'oh-my-pi', sessionId: 'omp-usage-session', agentId: null };

type Handler = (payload: unknown, context: unknown) => Promise<unknown>;
let callCounter = 0;

function registration(): { readonly api: OmpApi; readonly handlers: Map<string, Handler> } {
  const handlers = new Map<string, Handler>();
  return { handlers, api: { on: (event: string, handler: Handler) => { handlers.set(event, handler); } } as unknown as OmpApi };
}

function context(root: string, usage: unknown): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => KEY.sessionId }, getContextUsage: () => usage, ui: { notify: () => {} } };
}

function nextCallId(): string {
  callCounter += 1;
  return `call-${callCounter}`;
}

async function runToolResult(handlers: Map<string, Handler>, root: string, usage: unknown): Promise<string> {
  const payload = { toolName: 'run_command', toolCallId: nextCallId(), input: { command: 'ls' }, content: [{ type: 'text', text: 'done' }] };
  const rendered = await handlers.get('tool_result')!(payload, context(root, usage));
  return (rendered as { content: { text?: string }[] }).content.at(-1)?.text ?? '';
}

async function lastToolLine(root: string): Promise<ToolLine> {
  const lines = await new NodeSessionLedger(root, fixedClock).readLines(KEY);
  return lines.filter((line): line is ToolLine => line.type === 'tool').at(-1)!;
}

async function checkWindowChange(root: string): Promise<void> {
  const { api, handlers } = registration();
  createOmpExtension(api);
  let usage: unknown = { tokens: 128000, contextWindow: 200000, percent: 64 };
  await runToolResult(handlers, root, usage);
  usage = { tokens: 90000, contextWindow: 100000, percent: 90 };
  const block = await runToolResult(handlers, root, usage);
  expect(block).toContain('tokens=90000/100000');
  expect(await lastToolLine(root)).toMatchObject({ windowTokens: 100000 });
}

async function checkMeasured(root: string): Promise<void> {
  const { api, handlers } = registration();
  createOmpExtension(api);
  const block = await runToolResult(handlers, root, { tokens: 128000, contextWindow: 200000, percent: 64 });
  expect(block).toContain('tokens=128000/200000 source=measured');
  expect(await lastToolLine(root)).toMatchObject({ source: 'measured', usedTokens: 128000, windowTokens: 200000 });
}

async function checkEstimated(root: string): Promise<void> {
  const { api, handlers } = registration();
  createOmpExtension(api);
  const block = await runToolResult(handlers, root, undefined);
  expect(block).toContain('source=estimated');
  expect(block).toContain('/24000');
  expect(await lastToolLine(root)).toMatchObject({ source: 'estimated', windowTokens: 24000 });
}

async function checkOmpReset(root: string): Promise<void> {
  const { api, handlers } = registration();
  createOmpExtension(api);
  await runToolResult(handlers, root, undefined);
  await handlers.get('auto_compaction_end')!({}, context(root, undefined));
  await runToolResult(handlers, root, undefined);
  expect(await lastToolLine(root)).toMatchObject({ turn: 1 });
}

describe('Oh-My-Pi measured and estimated usage (RF5, RF6, RF7, RF8, TC-11)', () => {
  let root: string;
  beforeEach(async () => {
    callCounter = 0;
    root = await mkdtemp(join(tmpdir(), 'cb-t07-omp-usage-'));
    await writeRuntimeConfig(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reports source=measured with the API tokens and window', async () => { await checkMeasured(root); });
  it('falls back to estimated with the configured window when the API returns undefined', async () => { await checkEstimated(root); });
  it('resets the count on auto_compaction_end', async () => { await checkOmpReset(root); });
  it('takes a reported window change into effect on the next reading', async () => { await checkWindowChange(root); });
});
