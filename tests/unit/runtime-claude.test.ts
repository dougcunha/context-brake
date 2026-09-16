import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapClaudeEvent, mapClaudeInput, renderClaudeDecision } from '../../src/infrastructure/harnesses/claude-code/runtime.js';

const SESSION = { harness: 'claude-code', sessionId: 'session-claude-1', agentId: null };

describe('Claude Code runtime tool events (RF12, RF14, TC-14, TC-33)', () => {
  it('maps the documented PreToolUse fixture to a classified pre-tool event', async () => {
    const event = mapClaudeEvent('PreToolUse', await loadHarnessPayload('claude-code', 'pre-tool-use.json'));
    expect(event).toEqual({ kind: 'pre_tool', session: SESSION, tool: { name: 'Bash', category: 'shell', paths: [], command: 'git status' } });
  });

  it('maps the documented PostToolUse fixture with its tool_use_id and tool_response', async () => {
    const payload = await loadHarnessPayload('claude-code', 'post-tool-use.json');
    const event = mapClaudeEvent('PostToolUse', payload) as { kind: string; toolUseId: string | null };
    expect(event.kind).toBe('post_tool');
    expect(event.toolUseId).toBe('toolu_claude_1');
    const fixture = payload as { tool_input: unknown; tool_response: unknown };
    const input = mapClaudeInput('PostToolUse', payload);
    expect(input.observedCharacters).toBe(JSON.stringify(fixture.tool_input).length + JSON.stringify(fixture.tool_response).length);
  });

  it('classifies every documented file tool and tolerates unknown fields', () => {
    expect(mapClaudeEvent('PreToolUse', { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'state_checkpoint.json' }, extra: true })).toMatchObject({ tool: { category: 'file_write', paths: ['state_checkpoint.json'] } });
    expect(mapClaudeEvent('PreToolUse', { session_id: 's', tool_name: 'Read', tool_input: { file_path: 'task_plan.json' } })).toMatchObject({ tool: { category: 'file_read' } });
    expect(mapClaudeEvent('PreToolUse', { session_id: 's', tool_name: 'WebSearch' })).toMatchObject({ tool: { category: 'other' } });
    expect(() => mapClaudeEvent('PreToolUse', {})).toThrow('The harness payload is invalid.');
  });
});

describe('Claude Code runtime lifecycle events (RF3, RF22, TC-21)', () => {
  it.each([
    ['startup', 'new'],
    ['fork', 'new'],
    ['clear', 'clear'],
    ['compact', 'compact'],
  ])('maps a SessionStart with source %s to a %s reset', (source, reason) => {
    expect(mapClaudeEvent('SessionStart', { session_id: 'session-claude-1', source })).toEqual({ kind: 'session_reset', session: SESSION, reason });
  });

  it('never resets on a resumed session and ignores unknown events', () => {
    expect(mapClaudeEvent('SessionStart', { session_id: 'session-claude-1', source: 'resume' })).toBeNull();
    expect(mapClaudeEvent('PreCompact', { session_id: 'session-claude-1' })).toBeNull();
  });

  it('maps the documented Stop fixture to the response text', async () => {
    const event = mapClaudeEvent('Stop', await loadHarnessPayload('claude-code', 'stop.json'));
    expect(event).toEqual({ kind: 'response_end', session: SESSION, text: 'Checkpoint saved and committed.\n[REQUEST_SESSION_RESET]' });
  });
});

describe('Claude Code response rendering (RF14, RF17, RF22, TC-14, TC-21)', () => {
  it('renders deny and context in the documented hookSpecificOutput fields', () => {
    const deny = renderClaudeDecision({ kind: 'deny', tool: 'Read', reason: 'critical_ceiling', message: 'BLOCKED' }, 'PreToolUse');
    expect(JSON.parse(deny ?? '')).toEqual({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'BLOCKED' } });
    const context = renderClaudeDecision({ kind: 'context', block: 'telemetry' }, 'PostToolUse');
    expect(JSON.parse(context ?? '')).toEqual({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'telemetry' } });
  });

  it('renders the reset notice as systemMessage and stays silent otherwise', () => {
    const notice = renderClaudeDecision({ kind: 'notify_user', text: 'notice' }, 'Stop');
    expect(JSON.parse(notice ?? '')).toEqual({ systemMessage: 'notice' });
    expect(renderClaudeDecision({ kind: 'neutral' }, 'PreToolUse')).toBeNull();
    expect(renderClaudeDecision({ kind: 'neutral' }, 'SessionStart')).toBeNull();
  });
});
