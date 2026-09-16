import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { hasResetSignal, renderResetNotice } from '../../src/core/services/reset-notice.js';
import { antigravityDescriptor, renderAntigravityDecision } from '../../src/infrastructure/harnesses/antigravity-cli/runtime.js';
import { claudeDescriptor, renderClaudeDecision } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { codexDescriptor, renderCodexDecision } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';
import { cursorDescriptor, renderCursorDecision } from '../../src/infrastructure/harnesses/cursor/runtime.js';
import { copilotDescriptor, renderCopilotDecision } from '../../src/infrastructure/harnesses/github-copilot-cli/runtime.js';
import { createOmpExtension, ompDescriptor, type OmpApi } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { createOpenCodePlugin, openCodeDescriptor } from '../../src/infrastructure/harnesses/opencode/runtime.js';
import { createPiExtension, piDescriptor, type PiApi } from '../../src/infrastructure/harnesses/pi/runtime.js';

const ROOT = join(tmpdir(), 'cb-t07-reset');
const NOTICE = renderResetNotice('/new');

type Handler = (payload: unknown, context: unknown) => Promise<unknown>;

function registration<T extends PiApi | OmpApi>(factory: (api: T) => void): Map<string, Handler> {
  const handlers = new Map<string, Handler>();
  const api = { on: (event: string, handler: Handler) => { handlers.set(event, handler); } } as unknown as T;
  factory(api);
  return handlers;
}

function notifyContext(notify: (message: string, level?: string) => void, sessionId: string): unknown {
  return { cwd: ROOT, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => undefined, ui: { notify } };
}

describe('reset signal detection (RF22, DEC-12, TC-21)', () => {
  it('recognizes the signal as the trimmed final text', () => {
    expect(hasResetSignal('[REQUEST_SESSION_RESET]')).toBe(true);
    expect(hasResetSignal('  [REQUEST_SESSION_RESET]  \n')).toBe(true);
  });
  it('does not recognize the signal when other text remains', () => {
    expect(hasResetSignal('Please end with [REQUEST_SESSION_RESET] when done.')).toBe(false);
    expect(hasResetSignal('[REQUEST_SESSION_RESET] and more')).toBe(false);
    expect(hasResetSignal('')).toBe(false);
    expect(hasResetSignal('requested a session reset')).toBe(false);
  });
  it('renders the notice with the harness command', () => {
    expect(renderResetNotice('/clear')).toBe('ContextBrake: the agent requested a session reset. Run /clear to start a new session.');
    expect(renderResetNotice('/new')).toBe('ContextBrake: the agent requested a session reset. Run /new to start a new session.');
  });
});

async function checkInProcessNotices(): Promise<void> {
  const piNotify = vi.fn();
  const ompNotify = vi.fn();
  const pi = registration<PiApi>((api) => createPiExtension(api));
  const omp = registration<OmpApi>((api) => createOmpExtension(api));
  await pi.get('message_end')!({ message: { role: 'assistant', content: [{ type: 'text', text: '[REQUEST_SESSION_RESET]' }] } }, notifyContext(piNotify, 'pi-reset'));
  await omp.get('session_stop')!({ last_assistant_message: '[REQUEST_SESSION_RESET]' }, notifyContext(ompNotify, 'omp-reset'));
  expect(piNotify).toHaveBeenCalledWith(NOTICE, 'info');
  expect(ompNotify).toHaveBeenCalledWith(NOTICE, 'info');
  await pi.get('message_end')!({ message: { role: 'assistant', content: [{ type: 'text', text: 'still working' }] } }, notifyContext(piNotify, 'pi-reset'));
  expect(piNotify).toHaveBeenCalledTimes(1);
}

describe('reset notice channels per harness (RF22, DEC-12, TC-21)', () => {
  const notice = { kind: 'notify_user', text: renderResetNotice('/clear') } as const;

  it('declares the documented new-session command only where one is documented', () => {
    expect(claudeDescriptor.newSessionCommand).toBe('/clear');
    expect(codexDescriptor.newSessionCommand).toBe('/new');
    expect(piDescriptor.newSessionCommand).toBe('/new');
    expect(ompDescriptor.newSessionCommand).toBe('/new');
    expect(cursorDescriptor.newSessionCommand).toBeNull();
    expect(copilotDescriptor.newSessionCommand).toBeNull();
    expect(antigravityDescriptor.newSessionCommand).toBeNull();
    expect(openCodeDescriptor.newSessionCommand).toBeNull();
  });

  it('delivers the notice on the Claude Code and Codex CLI Stop channels only', () => {
    expect(JSON.parse(renderClaudeDecision(notice, 'Stop') ?? '')).toEqual({ systemMessage: notice.text });
    expect(JSON.parse(renderCodexDecision(notice, 'Stop') ?? '')).toEqual({ systemMessage: notice.text });
    expect(renderCursorDecision(notice, 'stop')).toBeNull();
    expect(renderCopilotDecision(notice)).toBeNull();
    expect(renderAntigravityDecision(notice, 'Stop')).toBeNull();
  });

  it('notifies through ctx.ui.notify for Pi message_end and Oh-My-Pi session_stop', async () => { await checkInProcessNotices(); });

  it('registers no notice channel for OpenCode', () => {
    const hooks = createOpenCodePlugin({ directory: ROOT });
    expect(hooks.event).toBeDefined();
    expect(hooks['tool.execute.before']).toBeDefined();
  });
});
