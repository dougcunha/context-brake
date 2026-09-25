import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { seedCriticalSession, writeRuntimeConfig } from '../helpers/runtime-seed.js';

type Handler = (payload: unknown, context?: unknown) => Promise<unknown>;
type HookObject = { readonly 'tool.execute.before'?: Handler; readonly 'tool.execute.after'?: Handler; readonly event?: Handler };

const PI_ASSET = resolve('dist/assets/runtime/pi-extension.js');
const OMP_ASSET = resolve('dist/assets/runtime/omp-extension.js');
const OPENCODE_ASSET = resolve('dist/assets/runtime/opencode-plugin.js');

async function loadPi(): Promise<Map<string, Handler>> {
  const module = (await import(pathToFileURL(PI_ASSET).href)) as { default: (api: unknown) => void };
  const handlers = new Map<string, Handler>();
  module.default({ on: (event: string, handler: Handler) => { handlers.set(event, handler); } });
  return handlers;
}

async function loadOmp(): Promise<Map<string, Handler>> {
  const module = (await import(pathToFileURL(OMP_ASSET).href)) as { default: (api: unknown) => void };
  const handlers = new Map<string, Handler>();
  module.default({ on: (event: string, handler: Handler) => { handlers.set(event, handler); } });
  return handlers;
}

async function loadOpenCode(context: unknown): Promise<HookObject> {
  const module = (await import(pathToFileURL(OPENCODE_ASSET).href)) as { default: (context?: unknown) => HookObject };
  return module.default(context);
}

function piContext(root: string, sessionId: string, usage: unknown): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => usage, ui: { notify: () => {} } };
}

async function checkPi(root: string): Promise<void> {
  const handlers = await loadPi();
  const measured = { tokens: 128000, contextWindow: 200000, percent: 64 };
  const rendered = await handlers.get('tool_result')!(await loadHarnessPayload('pi', 'tool-result.json'), piContext(root, 'pi-built', measured)) as { content: unknown[] };
  expect(rendered.content).toHaveLength(2);
  expect(rendered.content[0]).toEqual({ type: 'text', text: 'tests passed' });
  expect((rendered.content[1] as { text: string }).text).toContain('tokens=128000/200000 source=measured');
  await seedCriticalSession(root, { harness: 'pi', sessionId: 'pi-critical', agentId: null });
  await expect(handlers.get('session_start')!({ reason: 'new' }, piContext(root, 'pi-reset', measured))).resolves.toBeUndefined();
  const blocked = await handlers.get('tool_call')!({ toolName: 'read', input: { path: 'src/a.ts' } }, piContext(root, 'pi-critical', { tokens: 160000, contextWindow: 200000, percent: 80 })) as { block: boolean; reason: string };
  expect(blocked).toMatchObject({ block: true });
  expect(blocked.reason).toContain('zone=CRITICAL');
}

async function checkOmp(root: string): Promise<void> {
  const handlers = await loadOmp();
  await seedCriticalSession(root, { harness: 'oh-my-pi', sessionId: 'omp-built', agentId: null });
  const stop = await loadHarnessPayload('oh-my-pi', 'session-stop.json');
  await expect(handlers.get('session_stop')!(stop, piContext(root, 'omp-built', undefined))).resolves.toBeUndefined();
  const blocked = await handlers.get('tool_call')!({ toolName: 'bash', input: { command: 'rm -rf x' } }, piContext(root, 'omp-built', undefined)) as { block: boolean; reason: string };
  expect(blocked).toMatchObject({ block: true });
  expect(blocked.reason).toContain('zone=CRITICAL');
}

async function checkOpenCode(root: string): Promise<void> {
  const hooks = await loadOpenCode({ directory: root });
  const before = await loadHarnessPayload('opencode', 'tool-execute-before.json') as { input: Record<string, unknown>; output: unknown };
  const green = { ...before.input, sessionID: 'opencode-green' };
  const critical = { ...before.input, sessionID: 'opencode-critical' };
  await expect(hooks['tool.execute.before']!(green, before.output)).resolves.toBeUndefined();
  await expect(hooks['tool.execute.after']!(green, { args: { command: 'npm test' }, output: 'done' })).resolves.toBeUndefined();
  await seedCriticalSession(root, { harness: 'opencode', sessionId: 'opencode-critical', agentId: null });
  await expect(hooks['tool.execute.before']!(critical, before.output)).rejects.toThrow('[ContextBrake v2] BLOCKED');
  await expect(hooks.event!(await loadHarnessPayload('opencode', 'session-compacted.json'))).resolves.toBeUndefined();
}

describe('built in-process extensions and plugin (RF5, RF12, RF17, RF21)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t07-built-inprocess-'));
    await writeRuntimeConfig(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('runs the built Pi extension: measured block, append, deny, and reset', async () => { await checkPi(root); });
  it('runs the built Oh-My-Pi extension with the session_stop notice', async () => { await checkOmp(root); });
  it('runs the built OpenCode plugin: documented arguments, deny throw, and session reset', async () => { await checkOpenCode(root); });
});
