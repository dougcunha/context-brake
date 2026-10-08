import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { createOmpExtension, type OmpApi } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-omp-switch-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Oh-My-Pi session switch and stop payloads (prd-14 DEC-20, FR-02, FR-12)', () => {
  it('delivers a pending handoff after a session switch to a new session', async () => {
    await writeFile(join(root, 'context-brake.config.json'), JSON.stringify({ ...DEFAULT_CONFIG, autoRestart: { maxConsecutiveRestarts: 2 } }), 'utf8');
    await mkdir(join(root, '.context-brake'), { recursive: true });
    await writeFile(join(root, '.context-brake', 'handoff.md'), '# Goal\n', 'utf8');
    const handlers = new Map<string, (payload: unknown, context: unknown) => Promise<unknown>>();
    createOmpExtension({ on: (event, handler) => { handlers.set(event, handler as (payload: unknown, context: unknown) => Promise<unknown>); } } as OmpApi);
    const context = { cwd: root, sessionManager: { getSessionId: () => 'omp-new' }, getContextUsage: () => undefined, ui: { notify: () => undefined } };
    await handlers.get('session_switch')!({ type: 'session_switch', reason: 'new' }, context);
    const boot = await handlers.get('before_agent_start')!({}, context) as { message: string };
    expect(boot.message).toMatch(/^\[ContextBrake resume v1\] Read "\.context-brake\/handoffs\/.+\.md" and continue the previous work from it\.$/);
  });
  it('reads the final text from a message-shaped last_assistant_message', async () => {
    const notices: string[] = [];
    const handlers = new Map<string, (payload: unknown, context: unknown) => Promise<unknown>>();
    createOmpExtension({ on: (event, handler) => { handlers.set(event, handler as (payload: unknown, context: unknown) => Promise<unknown>); } } as OmpApi);
    const context = { cwd: root, sessionManager: { getSessionId: () => 'omp-stop' }, getContextUsage: () => undefined, ui: { notify: (text: string) => { notices.push(text); } } };
    await handlers.get('session_stop')!(await loadHarnessPayload('oh-my-pi', 'session-stop-reset.json'), context);
    expect(notices).toEqual(['ContextBrake: the agent requested a session reset. Run /new to start a new session.']);
  });
});
