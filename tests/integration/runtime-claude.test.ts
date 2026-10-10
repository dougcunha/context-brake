import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { RecordingErrors } from '../helpers/recording-ledger.js';
import { mapClaudeEvent, mapClaudeInput, renderClaudeDecision } from '../../src/infrastructure/harnesses/claude-code/runtime.js';

const SESSION = { harness: 'claude-code', sessionId: 'session-claude-1', agentId: null };
const FIXTURE_CHARACTERS = 208;

describe('Claude Code runtime tool events (RF12, RF14, TC-14, TC-33)', () => {
  it('maps the documented PostToolUse fixture with its tool_use_id, counts its input and response characters, and ignores PreToolUse (prd-12 TC-09)', async () => {
    const payload = await loadHarnessPayload('claude-code', 'post-tool-use.json');
    expect(mapClaudeEvent('PostToolUse', payload)).toEqual({ kind: 'post_tool', session: SESSION, tool: { name: 'Bash', category: 'shell', paths: [], command: 'git status' }, toolUseId: 'toolu_claude_1' });
    expect(await mapClaudeInput('PostToolUse', payload, new RecordingErrors())).toEqual({ observedCharacters: FIXTURE_CHARACTERS });
    expect(mapClaudeEvent('PreToolUse', { session_id: 's', tool_name: 'Bash' })).toBeNull();
  });

  it('classifies every documented file tool and tolerates unknown fields', () => {
    expect(mapClaudeEvent('PostToolUse', { session_id: 's', tool_name: 'Write', tool_input: { file_path: 'state_checkpoint.json' }, extra: true })).toMatchObject({ tool: { category: 'file_write', paths: ['state_checkpoint.json'] } });
    expect(mapClaudeEvent('PostToolUse', { session_id: 's', tool_name: 'Read', tool_input: { file_path: 'task_plan.json' } })).toMatchObject({ tool: { category: 'file_read' } });
    expect(mapClaudeEvent('PostToolUse', { session_id: 's', tool_name: 'WebSearch' })).toMatchObject({ tool: { category: 'other' } });
    expect(() => mapClaudeEvent('PostToolUse', {})).toThrow('The harness payload is invalid.');
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
  it('renders context in hookSpecificOutput, the reset notice as systemMessage, and nothing for a neutral decision', () => {
    const context = renderClaudeDecision({ kind: 'context', block: 'telemetry' }, 'PostToolUse');
    expect(JSON.parse(context ?? '')).toEqual({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'telemetry' } });
    expect(JSON.parse(renderClaudeDecision({ kind: 'notify_user', text: 'notice' }, 'Stop') ?? '')).toEqual({ systemMessage: 'notice' });
    expect(renderClaudeDecision({ kind: 'neutral' }, 'PostToolUse')).toBeNull();
  });
});
