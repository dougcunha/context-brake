import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapCursorEvent, mapCursorInput, renderCursorDecision } from '../../src/infrastructure/harnesses/cursor/runtime.js';

const SESSION = { harness: 'cursor', sessionId: 'cursor-conv-1', agentId: null };

describe('Cursor runtime event mapping (RF3, RF12, DEC-13, TC-33)', () => {
  it('keeps undocumented file tools unclassified and classifies Shell from its command', async () => {
    const fixture = await loadHarnessPayload('cursor', 'pre-tool-use.json');
    expect(mapCursorEvent('preToolUse', fixture)).toMatchObject({ tool: { name: 'ReadFile', category: 'other' } });
    const shell = { conversation_id: 'cursor-conv-1', tool_name: 'Shell', tool_input: { command: 'ls' } };
    expect(mapCursorEvent('preToolUse', shell)).toEqual({ kind: 'pre_tool', session: SESSION, tool: { name: 'Shell', category: 'shell', paths: [], command: 'ls' } });
  });

  it('maps the documented postToolUse fixture with its call identifier', async () => {
    const event = mapCursorEvent('postToolUse', await loadHarnessPayload('cursor', 'post-tool-use.json')) as { kind: string; toolUseId: string | null };
    expect(event.kind).toBe('post_tool');
    expect(event.toolUseId).toBe('cursor-call-1');
  });

  it('resets on sessionStart and preCompact and ignores unsupported events', async () => {
    expect(mapCursorEvent('sessionStart', await loadHarnessPayload('cursor', 'session-start.json'))).toEqual({ kind: 'session_reset', session: SESSION, reason: 'new' });
    expect(mapCursorEvent('preCompact', await loadHarnessPayload('cursor', 'pre-compact.json'))).toEqual({ kind: 'session_reset', session: SESSION, reason: 'compact' });
    expect(mapCursorEvent('stop', { conversation_id: 'cursor-conv-1' })).toBeNull();
  });

  it('counts tool_input and tool_output characters on post-tool events', async () => {
    const payload = await loadHarnessPayload('cursor', 'post-tool-use.json');
    expect(mapCursorInput('postToolUse', payload).observedCharacters).toBe(JSON.stringify({ command: 'git status' }).length + 'file content here'.length);
  });
});

describe('Cursor response rendering (RF14, RF17, TC-14)', () => {
  it('allows neutrally on preToolUse because permission is a required field', () => {
    expect(JSON.parse(renderCursorDecision({ kind: 'neutral' }, 'preToolUse') ?? '')).toEqual({ permission: 'allow' });
  });

  it('renders the deny shape with both documented messages', () => {
    const rendered = JSON.parse(renderCursorDecision({ kind: 'deny', tool: 'Shell', reason: 'critical_ceiling', message: 'BLOCKED' }, 'preToolUse') ?? '') as Record<string, unknown>;
    expect(rendered).toEqual({ permission: 'deny', agent_message: 'BLOCKED', user_message: 'ContextBrake blocked Shell: the session is above the critical ceiling.' });
  });

  it('injects telemetry through additional_context and stays silent elsewhere', () => {
    expect(JSON.parse(renderCursorDecision({ kind: 'context', block: 'telemetry' }, 'postToolUse') ?? '')).toEqual({ additional_context: 'telemetry' });
    expect(renderCursorDecision({ kind: 'neutral' }, 'postToolUse')).toBeNull();
    expect(renderCursorDecision({ kind: 'notify_user', text: 'notice' }, 'stop')).toBeNull();
  });
});
