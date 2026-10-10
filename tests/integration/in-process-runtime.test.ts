import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOmpExtension, type OmpApi } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { createPiExtension, type PiApi } from '../../src/infrastructure/harnesses/pi/runtime.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';
import { seedCriticalSession, writeInvalidRuntimeConfig } from '../helpers/runtime-seed.js';

type Handler = (payload: unknown, context: unknown) => Promise<unknown>;
type Registration = { readonly api: PiApi & OmpApi; readonly handlers: Map<string, Handler> };

function registration(): Registration {
  const handlers = new Map<string, Handler>();
  return { handlers, api: { on: (event: string, handler: Handler) => { handlers.set(event, handler); } } as unknown as PiApi & OmpApi };
}

function piContext(root: string, sessionId: string): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => ({ tokens: null, contextWindow: 24000 }), ui: { notify: () => undefined } };
}

describe('in-process harness tool calls (prd-12 FR-07, TC-09)', () => {
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
  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it.each([
    { zone: 'below the ceiling', critical: false },
    { zone: 'above the ceiling (prd-12 TC-10)', critical: true },
  ])('stays neutral $zone without writing to stdout when the configuration is invalid', async ({ critical }) => {
    await writeInvalidRuntimeConfig(root);
    if (critical) await seedCriticalSession(root, { harness: 'pi', sessionId: 'pi-session-1', agentId: null });
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { api, handlers } = registration();
    createPiExtension(api);
    const result = await handlers.get('tool_result')!({ toolName: 'read', input: { path: 'src/a.ts' }, content: [] }, piContext(root, 'pi-session-1'));
    expect(result).toBeUndefined();
    expect(write).not.toHaveBeenCalled();
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('INVALID_CONFIG');
  });
});
