import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapCodexEvent, mapCodexInput, renderCodexDecision } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';

const SESSION = { harness: 'codex-cli', sessionId: 'codex-sess-1', agentId: null };

function toolOf(event: RuntimeEvent | null): unknown {
  return event !== null && 'tool' in event ? event.tool : null;
}

describe('Codex CLI runtime event mapping (RF1, RF12, DEC-12, TC-33)', () => {
  it('maps the documented PreToolUse fixture and classifies Bash as a shell call', async () => {
    const payload = await loadHarnessPayload('codex-cli', 'pre-tool-use.json');
    const event = mapCodexEvent('PreToolUse', { ...(payload as object), tool_input: { command: 'ls' } });
    expect(event).toEqual({ kind: 'pre_tool', session: SESSION, tool: { name: 'apply_patch', category: 'other', paths: [], command: null } });
    expect(toolOf(mapCodexEvent('PreToolUse', { session_id: 'codex-sess-1', tool_name: 'Bash', tool_input: { command: 'ls' } }))).toEqual({ name: 'Bash', category: 'shell', paths: [], command: 'ls' });
  });

  it('parses the patch paths of an apply_patch call', () => {
    const command = '*** Begin Patch\n*** Update File: src/app.ts\n@@\n*** Add File: src/new.ts\n*** Delete File: src/old.ts\n*** Move to: src/moved.ts\n*** End Patch';
    const event = mapCodexEvent('PreToolUse', { session_id: 'codex-sess-1', tool_name: 'apply_patch', tool_input: { command } });
    expect(toolOf(event)).toEqual({ name: 'apply_patch', category: 'file_write', paths: ['src/app.ts', 'src/new.ts', 'src/old.ts', 'src/moved.ts'], command: null });
  });

  it('maps the documented PostToolUse fixture and Stop fixture', async () => {
    const post = mapCodexEvent('PostToolUse', await loadHarnessPayload('codex-cli', 'post-tool-use.json')) as { kind: string; toolUseId: string | null };
    expect(post.kind).toBe('post_tool');
    expect(post.toolUseId).toBe('exec-codex-1');
    const stop = mapCodexEvent('Stop', await loadHarnessPayload('codex-cli', 'stop.json'));
    expect(stop).toEqual({ kind: 'response_end', session: SESSION, text: '[REQUEST_SESSION_RESET]' });
  });

  it('resets on startup, clear, and compact but not on resume', () => {
    expect(mapCodexEvent('SessionStart', { session_id: 'codex-sess-1', source: 'compact' })).toMatchObject({ kind: 'session_reset', reason: 'compact' });
    expect(mapCodexEvent('SessionStart', { session_id: 'codex-sess-1', source: 'resume' })).toBeNull();
  });

  it('counts the documented tool input and output characters', async () => {
    const payload = await loadHarnessPayload('codex-cli', 'post-tool-use.json');
    const fixture = payload as { tool_input: unknown; tool_response: string };
    expect(mapCodexInput('PostToolUse', payload).observedCharacters).toBe(JSON.stringify(fixture.tool_input).length + fixture.tool_response.length);
    expect(mapCodexInput('PreToolUse', payload).observedCharacters).toBeUndefined();
  });
});

describe('Codex CLI response rendering (RF14, RF17, RF22, TC-14, TC-21)', () => {
  it('renders deny, context, and notice in documented JSON fields and nothing else', () => {
    expect(JSON.parse(renderCodexDecision({ kind: 'deny', tool: 'Bash', reason: 'critical_ceiling', message: 'BLOCKED' }, 'PreToolUse') ?? '')).toEqual({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'BLOCKED' } });
    expect(JSON.parse(renderCodexDecision({ kind: 'context', block: 'telemetry' }, 'PostToolUse') ?? '')).toEqual({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'telemetry' } });
    expect(JSON.parse(renderCodexDecision({ kind: 'notify_user', text: 'notice' }, 'Stop') ?? '')).toEqual({ systemMessage: 'notice' });
    expect(renderCodexDecision({ kind: 'neutral' }, 'PreToolUse')).toBeNull();
  });
});
