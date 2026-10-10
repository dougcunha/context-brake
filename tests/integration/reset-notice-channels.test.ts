import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderResetNotice } from '../../src/core/services/reset-notice.js';
import { antigravityDescriptor, renderAntigravityDecision } from '../../src/infrastructure/harnesses/antigravity-cli/runtime.js';
import { claudeDescriptor, renderClaudeDecision } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { codexDescriptor, renderCodexDecision } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';
import { cursorDescriptor, renderCursorDecision } from '../../src/infrastructure/harnesses/cursor/runtime.js';
import { copilotDescriptor, renderCopilotDecision } from '../../src/infrastructure/harnesses/github-copilot-cli/runtime.js';
import { createOmpExtension, ompDescriptor } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { openCodeDescriptor } from '../../src/infrastructure/harnesses/opencode/runtime.js';
import { createPiExtension, piDescriptor } from '../../src/infrastructure/harnesses/pi/runtime.js';
import { registerExtension } from '../helpers/in-process-extension.js';

const NEW_NOTICE = 'ContextBrake: the agent requested a session reset. Run /new to start a new session.';

function notifyContext(root: string, notify: (message: string, level?: string) => void): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => 'session-reset' }, getContextUsage: () => undefined, ui: { notify } };
}

async function checkInProcessNotices(root: string): Promise<void> {
  const piNotify = vi.fn();
  const ompNotify = vi.fn();
  const pi = registerExtension(createPiExtension);
  const omp = registerExtension(createOmpExtension);
  await pi.get('message_end')!({ message: { role: 'assistant', content: [{ type: 'text', text: '[REQUEST_SESSION_RESET]' }] } }, notifyContext(root, piNotify));
  await omp.get('session_stop')!({ last_assistant_message: 'Handoff written.\n[REQUEST_SESSION_RESET]' }, notifyContext(root, ompNotify));
  expect(piNotify).toHaveBeenCalledWith(NEW_NOTICE, 'info');
  expect(ompNotify).toHaveBeenCalledWith(NEW_NOTICE, 'info');
  await pi.get('message_end')!({ message: { role: 'assistant', content: [{ type: 'text', text: 'still working' }] } }, notifyContext(root, piNotify));
  expect(piNotify).toHaveBeenCalledTimes(1);
}

describe('reset notice channels per harness (RF22, DEC-12, TC-21)', () => {
  const notice = { kind: 'notify_user', text: renderResetNotice('/clear') } as const;
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-reset-notice-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

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

  it('notifies through ctx.ui.notify for Pi message_end and Oh-My-Pi session_stop', async () => { await checkInProcessNotices(root); });
});
