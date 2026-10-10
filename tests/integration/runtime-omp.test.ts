import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapOmpEvent, mapOmpInput, renderOmpToolResult } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';

const SESSION = { harness: 'oh-my-pi', sessionId: 'omp-session-1', agentId: null } as const;
const FIXTURE_CHARACTERS = 61;
const FIXTURE_TOOL = { name: 'run_command', category: 'shell', paths: [], command: 'npm test' };

describe('Oh-My-Pi runtime event mapping (RF1, RF3, RF12, TC-33)', () => {
  it('maps the documented tool_result fixture with its call identifier and character count, and classifies shell and file tools', async () => {
    const payload = await loadHarnessPayload('oh-my-pi', 'tool-result.json');
    const fixture = mapOmpEvent('tool_result', payload, SESSION);
    expect(fixture).toEqual({ kind: 'post_tool', session: SESSION, tool: FIXTURE_TOOL, toolUseId: 'call_omp_result' });
    expect(mapOmpInput('tool_result', payload)).toEqual({ observedCharacters: FIXTURE_CHARACTERS });
    expect(mapOmpEvent('tool_result', { toolName: 'bash', input: { command: 'ls' } }, SESSION)).toMatchObject({ tool: { category: 'shell', command: 'ls' } });
    expect(mapOmpEvent('tool_result', { toolName: 'edit', input: { path: 'src/a.ts' } }, SESSION)).toMatchObject({ tool: { category: 'file_write' } });
  });

  it('maps session_start, both compaction events, and session_stop', async () => {
    expect(mapOmpEvent('session_start', { reason: 'new' }, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'new' });
    expect(mapOmpEvent('session_start', { reason: 'startup' }, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'new' });
    expect(mapOmpEvent('session_start', { reason: 'resume' }, SESSION)).toBeNull();
    expect(mapOmpEvent('session_compact', {}, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'compact' });
    expect(mapOmpEvent('auto_compaction_end', {}, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'compact' });
    const stop = await loadHarnessPayload('oh-my-pi', 'session-stop.json');
    expect(mapOmpEvent('session_stop', stop, SESSION)).toEqual({ kind: 'response_end', session: SESSION, text: 'Checkpoint saved and committed.\n[REQUEST_SESSION_RESET]' });
  });

  it('rejects an invalid payload and ignores unknown events', () => {
    expect(() => mapOmpEvent('tool_result', 42, SESSION)).toThrow('The harness payload is invalid.');
    expect(mapOmpEvent('before_agent_start', {}, SESSION)).toBeNull();
  });
});

describe('Oh-My-Pi runtime response rendering (RF14, RF17, TC-14)', () => {
  it('appends exactly one text part after the original content parts', async () => {
    const rendered = renderOmpToolResult(await loadHarnessPayload('oh-my-pi', 'tool-result.json'), 'telemetry');
    expect(rendered.content).toEqual([
      { type: 'text', text: 'tests passed' },
      { type: 'text', text: 'telemetry' },
    ]);
  });
});
