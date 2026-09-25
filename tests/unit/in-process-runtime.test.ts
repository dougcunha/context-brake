import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOmpExtension, type OmpApi } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { createOpenCodePlugin } from '../../src/infrastructure/harnesses/opencode/runtime.js';
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
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => undefined, ui: { notify } };
}

function ompContext(root: string, sessionId: string): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => undefined, ui: { notify: () => {} } };
}

function call(handlers: Map<string, Handler>, event: string): (payload: unknown, context: unknown) => Promise<unknown> {
  return (payload, context) => handlers.get(event)!(payload, context);
}

describe('in-process harness deny semantics (RF17, RF19, TC-32)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t07-deny-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('lets Pi and Oh-My-Pi tool calls run below the ceiling and blocks them above it', async () => {
    const pi = registration();
    const omp = registration();
    createPiExtension(pi.api);
    createOmpExtension(omp.api);
    const payload = { toolName: 'read', input: { path: 'src/a.ts' } };
    expect(await call(pi.handlers, 'tool_call')(payload, piContext(root, 'pi-green'))).toBeUndefined();
    expect(await call(omp.handlers, 'tool_call')(payload, ompContext(root, 'omp-green'))).toBeUndefined();
    await seedCriticalSession(root, { harness: 'pi', sessionId: 'pi-critical', agentId: null });
    await seedCriticalSession(root, { harness: 'oh-my-pi', sessionId: 'omp-critical', agentId: null });
    const piBlocked = await call(pi.handlers, 'tool_call')(payload, piContext(root, 'pi-critical')) as { block: boolean; reason: string };
    const ompBlocked = await call(omp.handlers, 'tool_call')(payload, ompContext(root, 'omp-critical')) as { block: boolean; reason: string };
    expect(piBlocked.block).toBe(true);
    expect(piBlocked.reason).toContain('zone=CRITICAL');
    expect(ompBlocked.block).toBe(true);
    expect(ompBlocked.reason).toContain('zone=CRITICAL');
  });

  it('throws the block message from OpenCode tool.execute.before above the ceiling', async () => {
    const hooks = createOpenCodePlugin({ directory: root });
    const green = { tool: 'bash', sessionID: 'opencode-green', callID: 'call-green' };
    const critical = { tool: 'bash', sessionID: 'opencode-critical', callID: 'call-critical' };
    await expect(hooks['tool.execute.before']!(green, { args: { command: 'rm -rf src' } })).resolves.toBeUndefined();
    await seedCriticalSession(root, { harness: 'opencode', sessionId: 'opencode-critical', agentId: null });
    await expect(hooks['tool.execute.before']!(critical, { args: { command: 'rm -rf src' } })).rejects.toThrow('[ContextBrake v2] BLOCKED');
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
    expect(await call(handlers, 'tool_call')({ toolName: 'read', input: { path: 'src/a.ts' } }, piContext(root, 'pi-session-1'))).toBeUndefined();
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('INVALID_CONFIG');
  });

  it('denies with the failure variant above the ceiling when the configuration is invalid', async () => {
    await writeInvalidRuntimeConfig(root);
    await seedCriticalSession(root, { harness: 'pi', sessionId: 'pi-session-1', agentId: null });
    const { api, handlers } = registration();
    createPiExtension(api);
    const blocked = await call(handlers, 'tool_call')({ toolName: 'read', input: { path: 'src/a.ts' } }, piContext(root, 'pi-session-1')) as { block: boolean; reason: string };
    expect(blocked.block).toBe(true);
    expect(blocked.reason).toContain('reason=integration_failure');
  });

  it('never writes to stdout from a registered in-process handler', async () => {
    await writeRuntimeConfig(root);
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { api, handlers } = registration();
    createPiExtension(api);
    await call(handlers, 'tool_call')({ toolName: 'read', input: { path: 'src/a.ts' } }, piContext(root, 'pi-session-1'));
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
});
