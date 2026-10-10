import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { createOmpExtension } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { extensionContext, lastToolLine, registerExtension, toolResultBlock } from '../helpers/in-process-extension.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';

const KEY: SessionKey = { harness: 'oh-my-pi', sessionId: 'omp-usage-session', agentId: null };
const MEASURED = { tokens: 128000, contextWindow: 200000, percent: 64 };
const CHANGED_WINDOW = { tokens: 90000, contextWindow: 100000, percent: 90 };
const INVALID_PAYLOAD = 42;

async function checkMeasuredAndWindowChange(root: string): Promise<void> {
  const handlers = registerExtension(createOmpExtension);
  const measured = await toolResultBlock({ handlers, context: extensionContext(root, KEY.sessionId, MEASURED), callId: 'call-1' });
  expect(measured).toContain('tokens=128000/200000 source=measured');
  expect(await lastToolLine(root, KEY)).toMatchObject({ source: 'measured', usedTokens: 128000, windowTokens: 200000 });
  const changed = await toolResultBlock({ handlers, context: extensionContext(root, KEY.sessionId, CHANGED_WINDOW), callId: 'call-2' });
  expect(changed).toContain('tokens=90000/100000');
  expect(await lastToolLine(root, KEY)).toMatchObject({ windowTokens: 100000 });
}

async function checkEstimatedAndInvalidPayload(root: string): Promise<void> {
  const handlers = registerExtension(createOmpExtension);
  const context = extensionContext(root, KEY.sessionId, undefined);
  const block = await toolResultBlock({ handlers, context, callId: 'call-1' });
  expect(block).toContain('source=estimated');
  expect(block).toContain('/24000');
  expect(await lastToolLine(root, KEY)).toMatchObject({ source: 'estimated', windowTokens: 24000 });
  await expect(handlers.get('tool_result')!(INVALID_PAYLOAD, context)).resolves.toBeUndefined();
}

async function checkReset(root: string): Promise<void> {
  const handlers = registerExtension(createOmpExtension);
  const context = extensionContext(root, KEY.sessionId, undefined);
  await toolResultBlock({ handlers, context, callId: 'call-1' });
  await handlers.get('auto_compaction_end')!({}, context);
  await toolResultBlock({ handlers, context, callId: 'call-2' });
  expect(await lastToolLine(root, KEY)).toMatchObject({ turn: 1 });
}

describe('Oh-My-Pi measured and estimated usage (RF5, RF6, RF7, RF8, TC-11)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t07-omp-usage-'));
    await writeRuntimeConfig(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reports source=measured with the API tokens and window, and takes a window change into effect on the next reading', async () => { await checkMeasuredAndWindowChange(root); });
  it('falls back to estimated with the configured window when the API returns undefined, and answers an invalid payload with nothing', async () => { await checkEstimatedAndInvalidPayload(root); });
  it('resets the count on auto_compaction_end', async () => { await checkReset(root); });
});
