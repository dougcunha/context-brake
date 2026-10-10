import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { fixedClock, seedCriticalSession, writeRuntimeConfig } from '../helpers/runtime-seed.js';

type Handler = (payload: unknown, context?: unknown) => Promise<unknown>;
type HookObject = { readonly 'tool.execute.after'?: Handler; readonly event?: Handler };

const RUNTIME_ASSETS = 'dist/assets/runtime';
const NEW_SESSION_NOTICE = 'ContextBrake: the agent requested a session reset. Run /new to start a new session.';

async function loadExtension(asset: string): Promise<Map<string, Handler>> {
  const module = (await import(pathToFileURL(resolve(RUNTIME_ASSETS, asset)).href)) as { default: (api: unknown) => void };
  const handlers = new Map<string, Handler>();
  module.default({ on: (event: string, handler: Handler) => { handlers.set(event, handler); } });
  return handlers;
}

async function loadOpenCode(context: unknown): Promise<HookObject> {
  const module = (await import(pathToFileURL(resolve(RUNTIME_ASSETS, 'opencode-plugin.js')).href)) as { default: (context?: unknown) => HookObject };
  return module.default(context);
}

function piContext(root: string, sessionId: string, usage: unknown): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => usage, ui: { notify: () => {} } };
}

function noticeContext(root: string, sessionId: string, notices: string[]): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => undefined, ui: { notify: (text: string) => { notices.push(text); } } };
}

async function checkPi(root: string): Promise<void> {
  const handlers = await loadExtension('pi-extension.js');
  const measured = { tokens: 128000, contextWindow: 200000, percent: 64 };
  const rendered = await handlers.get('tool_result')!(await loadHarnessPayload('pi', 'tool-result.json'), piContext(root, 'pi-built', measured)) as { content: unknown[] };
  expect(rendered.content).toEqual([{ type: 'text', text: 'tests passed' }, { type: 'text', text: expect.stringContaining('tokens=128000/200000 source=measured') }]);
  const notices: string[] = [];
  await handlers.get('message_end')!(await loadHarnessPayload('pi', 'message-end.json'), noticeContext(root, 'pi-built', notices));
  expect(notices).toEqual([NEW_SESSION_NOTICE]);
  expect(handlers.has('tool_call')).toBe(false);
}

async function checkOmp(root: string): Promise<void> {
  const handlers = await loadExtension('omp-extension.js');
  await seedCriticalSession(root, { harness: 'oh-my-pi', sessionId: 'omp-built', agentId: null });
  const notices: string[] = [];
  await handlers.get('session_stop')!(await loadHarnessPayload('oh-my-pi', 'session-stop.json'), noticeContext(root, 'omp-built', notices));
  expect(notices).toEqual([NEW_SESSION_NOTICE]);
  expect(handlers.has('tool_call')).toBe(false);
}

async function checkOpenCode(root: string): Promise<void> {
  const hooks = await loadOpenCode({ directory: root });
  const after = await loadHarnessPayload('opencode', 'tool-execute-after.json') as { input: unknown; output: unknown };
  expect('tool.execute.before' in hooks).toBe(false);
  await hooks['tool.execute.after']!(after.input, after.output);
  await hooks.event!(await loadHarnessPayload('opencode', 'session-compacted.json'));
  const lines = await new NodeSessionLedger(root, fixedClock).readLines({ harness: 'opencode', sessionId: 'opencode-session-1', agentId: null });
  expect(lines.map((line) => line.type)).toEqual(['session', 'tool', 'reset']);
}

describe('built in-process extensions and plugin (RF5, RF12, RF17, RF21; prd-13 T04; prd-14 TC-10)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t07-built-inprocess-'));
    await writeRuntimeConfig(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('runs the built Pi extension: measured block appended, /new notice, and no pre-tool handler', async () => { await checkPi(root); });
  it('runs the built Oh-My-Pi extension with the session_stop notice', async () => { await checkOmp(root); });
  it('runs the built OpenCode plugin: no pre-tool hook, the tool call and the compaction reach the ledger', async () => { await checkOpenCode(root); });
});
