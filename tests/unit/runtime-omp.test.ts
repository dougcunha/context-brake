import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapOmpEvent, mapOmpInput, renderOmpToolResult } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';

const SESSION = { harness: 'oh-my-pi', sessionId: 'omp-session-1', agentId: null } as const;

function toolOf(event: RuntimeEvent | null): unknown {
  return event !== null && 'tool' in event ? event.tool : null;
}

describe('Oh-My-Pi runtime event mapping (RF1, RF3, RF12, TC-33)', () => {
  it('maps tool_result fixtures and classifies bash and run_command as shell calls', async () => {
    const fixture = mapOmpEvent('tool_result', await loadHarnessPayload('oh-my-pi', 'tool-result.json'), SESSION);
    expect(toolOf(fixture)).toEqual({ name: 'run_command', category: 'shell', paths: [], command: 'npm test' });
    expect(mapOmpEvent('tool_call', { toolName: 'bash' }, SESSION)).toBeNull();
    expect(toolOf(mapOmpEvent('tool_result', { toolName: 'bash', input: { command: 'ls' } }, SESSION))).toMatchObject({ category: 'shell', command: 'ls' });
    expect(toolOf(mapOmpEvent('tool_result', { toolName: 'edit', input: { path: 'src/a.ts' } }, SESSION))).toMatchObject({ category: 'file_write' });
  });

  it('maps the documented tool_result fixture and counts input plus content characters', async () => {
    const payload = await loadHarnessPayload('oh-my-pi', 'tool-result.json');
    const event = mapOmpEvent('tool_result', payload, SESSION) as { kind: string; toolUseId: string | null };
    expect(event.kind).toBe('post_tool');
    expect(event.toolUseId).toBe('call_omp_result');
    const fixture = payload as { input: unknown; content: unknown };
    expect(mapOmpInput('tool_result', payload).observedCharacters).toBe(JSON.stringify(fixture.input).length + JSON.stringify(fixture.content).length);
  });

  it('maps session_start, both compaction events, and session_stop', async () => {
    expect(mapOmpEvent('session_start', { reason: 'new' }, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'new' });
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
