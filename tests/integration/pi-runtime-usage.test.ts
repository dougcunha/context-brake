import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { createPiExtension } from '../../src/infrastructure/harnesses/pi/runtime.js';
import { extensionContext, lastToolLine, registerExtension, toolResultBlock } from '../helpers/in-process-extension.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';

const KEY: SessionKey = { harness: 'pi', sessionId: 'pi-usage-session', agentId: null };
const MEASURED = { tokens: 128000, contextWindow: 200000, percent: 64 };
const CHANGED_WINDOW = { tokens: 90000, contextWindow: 100000, percent: 90 };
const NULL_TOKENS = { tokens: null, contextWindow: 200000, percent: null };
const INVALID_PAYLOAD = 42;

async function checkMeasuredAndWindowChange(root: string): Promise<void> {
  const handlers = registerExtension(createPiExtension);
  const measured = await toolResultBlock({ handlers, context: extensionContext(root, KEY.sessionId, MEASURED), callId: 'call-1' });
  expect(measured).toContain('tokens=128000/200000 source=measured');
  expect(await lastToolLine(root, KEY)).toMatchObject({ source: 'measured', usedTokens: 128000, windowTokens: 200000 });
  const changed = await toolResultBlock({ handlers, context: extensionContext(root, KEY.sessionId, CHANGED_WINDOW), callId: 'call-2' });
  expect(changed).toContain('tokens=90000/100000');
  expect(await lastToolLine(root, KEY)).toMatchObject({ windowTokens: 100000 });
}

async function checkEstimatedAndInvalidPayload(root: string): Promise<void> {
  const handlers = registerExtension(createPiExtension);
  const absent = await toolResultBlock({ handlers, context: extensionContext(root, KEY.sessionId, undefined), callId: 'call-1' });
  expect(absent).toContain('source=estimated');
  expect(absent).toContain('/24000');
  expect(await lastToolLine(root, KEY)).toMatchObject({ source: 'estimated', windowTokens: 24000 });
  const nullTokens = extensionContext(root, KEY.sessionId, NULL_TOKENS);
  await toolResultBlock({ handlers, context: nullTokens, callId: 'call-2' });
  expect(await lastToolLine(root, KEY)).toMatchObject({ source: 'estimated', windowTokens: 200000 });
  await expect(handlers.get('tool_result')!(INVALID_PAYLOAD, nullTokens)).resolves.toBeUndefined();
}

async function checkReset(root: string): Promise<void> {
  const handlers = registerExtension(createPiExtension);
  const context = extensionContext(root, KEY.sessionId, undefined);
  await toolResultBlock({ handlers, context, callId: 'call-1' });
  await handlers.get('session_compact')!({}, context);
  await toolResultBlock({ handlers, context, callId: 'call-2' });
  expect(await lastToolLine(root, KEY)).toMatchObject({ turn: 1 });
}

describe('Pi measured and estimated usage (RF5, RF6, RF7, RF8, TC-11)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t07-pi-usage-'));
    await writeRuntimeConfig(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reports source=measured with the API tokens and window, and takes a window change into effect on the next reading', async () => { await checkMeasuredAndWindowChange(root); });
  it('falls back to estimated over the configured window without usage and over the API window with null tokens, and answers an invalid payload with nothing (PRD 2.2 DEC-06)', async () => { await checkEstimatedAndInvalidPayload(root); });
  it('resets the count on session_compact', async () => { await checkReset(root); });
});
