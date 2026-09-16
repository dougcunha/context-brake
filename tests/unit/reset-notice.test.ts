import { describe, expect, it } from 'vitest';
import { hasResetSignal, renderResetNotice } from '../../src/core/services/reset-notice.js';
import { antigravityDescriptor, renderAntigravityDecision } from '../../src/infrastructure/harnesses/antigravity-cli/runtime.js';
import { claudeDescriptor, renderClaudeDecision } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { codexDescriptor, renderCodexDecision } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';
import { cursorDescriptor, renderCursorDecision } from '../../src/infrastructure/harnesses/cursor/runtime.js';
import { copilotDescriptor, renderCopilotDecision } from '../../src/infrastructure/harnesses/github-copilot-cli/runtime.js';

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

describe('reset notice channels per harness (RF22, DEC-12, TC-21)', () => {
  const notice = { kind: 'notify_user', text: renderResetNotice('/clear') } as const;

  it('declares the documented new-session command only where one is documented', () => {
    expect(claudeDescriptor.newSessionCommand).toBe('/clear');
    expect(codexDescriptor.newSessionCommand).toBe('/new');
    expect(cursorDescriptor.newSessionCommand).toBeNull();
    expect(copilotDescriptor.newSessionCommand).toBeNull();
    expect(antigravityDescriptor.newSessionCommand).toBeNull();
  });

  it('delivers the notice on the Claude Code and Codex CLI Stop channels only', () => {
    expect(JSON.parse(renderClaudeDecision(notice, 'Stop') ?? '')).toEqual({ systemMessage: notice.text });
    expect(JSON.parse(renderCodexDecision(notice, 'Stop') ?? '')).toEqual({ systemMessage: notice.text });
    expect(renderCursorDecision(notice, 'stop')).toBeNull();
    expect(renderCopilotDecision(notice)).toBeNull();
    expect(renderAntigravityDecision(notice, 'Stop')).toBeNull();
  });
});
