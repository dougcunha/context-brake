import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOmpExtension, type OmpApi } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { createPiExtension, type PiApi } from '../../src/infrastructure/harnesses/pi/runtime.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';
import { seedCriticalSession, writeInvalidRuntimeConfig, writeRuntimeConfig } from '../helpers/runtime-seed.js';

type Handler = (payload: unknown, context: unknown) => Promise<unknown>;
type Registration = { readonly api: PiApi & OmpApi; readonly handlers: Map<string, Handler> };

function registration(): Registration {
  const handlers = new Map<string, Handler>();
  return { handlers, api: { on: (event: string, handler: Handler) => { handlers.set(event, handler); } } as unknown as PiApi & OmpApi };
}

function piContext(root: string, sessionId: string, notify: (message: string, level?: string) => void = () => {}): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => ({ tokens: null, contextWindow: 24000 }), ui: { notify } };
}

function call(handlers: Map<string, Handler>, event: string): (payload: unknown, context: unknown) => Promise<unknown> {
  return (payload, context) => handlers.get(event)!(payload, context);
}

describe('in-process harness tool calls (prd-12 FR-07, TC-09)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t07-deny-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('registers no tool_call handler on Pi and Oh-My-Pi', () => {
    const pi = registration();
    const omp = registration();
    createPiExtension(pi.api);
    createOmpExtension(omp.api);
    expect([pi.handlers.has('tool_call'), omp.handlers.has('tool_call')]).toEqual([false, false]);
    expect([pi.handlers.has('tool_result'), omp.handlers.has('tool_result')]).toEqual([true, true]);
  });
});

describe('in-process failure policy (RF19, DEC-09, TC-32)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t07-fail-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('stays neutral below the ceiling when the configuration is invalid', async () => {
    await writeInvalidRuntimeConfig(root);
    const { api, handlers } = registration();
    createPiExtension(api);
    expect(await call(handlers, 'tool_result')({ toolName: 'read', input: { path: 'src/a.ts' }, content: [] }, piContext(root, 'pi-session-1'))).toBeUndefined();
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('INVALID_CONFIG');
  });

  it('stays neutral above the ceiling when the configuration is invalid (prd-12 TC-10)', async () => {
    await writeInvalidRuntimeConfig(root);
    await seedCriticalSession(root, { harness: 'pi', sessionId: 'pi-session-1', agentId: null });
    const { api, handlers } = registration();
    createPiExtension(api);
    expect(await call(handlers, 'tool_result')({ toolName: 'read', input: { path: 'src/a.ts' }, content: [] }, piContext(root, 'pi-session-1'))).toBeUndefined();
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('INVALID_CONFIG');
  });

  it('never writes to stdout from a registered in-process handler', async () => {
    await writeRuntimeConfig(root);
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { api, handlers } = registration();
    createPiExtension(api);
    await call(handlers, 'tool_result')({ toolName: 'read', input: { path: 'src/a.ts' }, content: [] }, piContext(root, 'pi-session-1'));
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
});
