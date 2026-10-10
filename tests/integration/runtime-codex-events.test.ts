import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { RecordingErrors } from '../helpers/recording-ledger.js';
import { mapCodexEvent, mapCodexInput, renderCodexDecision } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';

const SESSION = { harness: 'codex-cli', sessionId: 'codex-sess-1', agentId: null };
const FIXTURE_CHARACTERS = 77;

function toolOf(event: RuntimeEvent | null): unknown {
  return event !== null && 'tool' in event ? event.tool : null;
}

describe('Codex CLI runtime event mapping (RF1, RF12, DEC-12, TC-33)', () => {
  it('maps the documented PostToolUse fixture and classifies Bash as a shell call', async () => {
    const event = mapCodexEvent('PostToolUse', await loadHarnessPayload('codex-cli', 'post-tool-use.json'));
    expect(event).toEqual({ kind: 'post_tool', session: SESSION, tool: { name: 'Bash', category: 'shell', paths: [], command: 'git status' }, toolUseId: 'exec-codex-1' });
    expect(toolOf(mapCodexEvent('PostToolUse', { session_id: 'codex-sess-1', tool_name: 'apply_patch' }))).toEqual({ name: 'apply_patch', category: 'other', paths: [], command: null });
    expect(mapCodexEvent('PreToolUse', { session_id: 'codex-sess-1', tool_name: 'Bash' })).toBeNull();
  });

  it('parses the patch paths of an apply_patch call', () => {
    const command = '*** Begin Patch\n*** Update File: src/app.ts\n@@\n*** Add File: src/new.ts\n*** Delete File: src/old.ts\n*** Move to: src/moved.ts\n*** End Patch';
    const event = mapCodexEvent('PostToolUse', { session_id: 'codex-sess-1', tool_name: 'apply_patch', tool_input: { command } });
    expect(toolOf(event)).toEqual({ name: 'apply_patch', category: 'file_write', paths: ['src/app.ts', 'src/new.ts', 'src/old.ts', 'src/moved.ts'], command: null });
  });

  it('counts the documented tool input and output characters', async () => {
    const payload = await loadHarnessPayload('codex-cli', 'post-tool-use.json');
    expect((await mapCodexInput('PostToolUse', payload, new RecordingErrors())).observedCharacters).toBe(FIXTURE_CHARACTERS);
    expect((await mapCodexInput('PreToolUse', payload, new RecordingErrors())).observedCharacters).toBeUndefined();
  });
});

describe('Codex CLI runtime lifecycle events (RF3, RF22, DEC-13)', () => {
  it.each([
    ['startup', 'new'],
    ['clear', 'clear'],
    ['compact', 'compact'],
  ])('maps a SessionStart with source %s to a %s reset', (source, reason) => {
    expect(mapCodexEvent('SessionStart', { session_id: 'codex-sess-1', source })).toEqual({ kind: 'session_reset', session: SESSION, reason });
  });

  it('never resets on a resumed or forked session', () => {
    expect(mapCodexEvent('SessionStart', { session_id: 'codex-sess-1', source: 'resume' })).toBeNull();
    expect(mapCodexEvent('SessionStart', { session_id: 'codex-sess-1', source: 'fork' })).toBeNull();
  });

  it('maps the documented Stop fixture to the response text', async () => {
    const stop = mapCodexEvent('Stop', await loadHarnessPayload('codex-cli', 'stop.json'));
    expect(stop).toEqual({ kind: 'response_end', session: SESSION, text: '[REQUEST_SESSION_RESET]' });
  });
});

describe('Codex CLI response rendering (RF14, RF17, RF22, TC-14, TC-21)', () => {
  it('renders context in hookSpecificOutput, the reset notice as systemMessage, and nothing for a neutral decision', () => {
    expect(JSON.parse(renderCodexDecision({ kind: 'context', block: 'telemetry' }, 'PostToolUse') ?? '')).toEqual({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'telemetry' } });
    expect(JSON.parse(renderCodexDecision({ kind: 'notify_user', text: 'notice' }, 'Stop') ?? '')).toEqual({ systemMessage: 'notice' });
    expect(renderCodexDecision({ kind: 'neutral' }, 'PostToolUse')).toBeNull();
  });
});
