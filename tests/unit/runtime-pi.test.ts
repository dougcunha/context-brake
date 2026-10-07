import { describe, expect, it } from 'vitest';
import type { RuntimeEvent } from '../../src/core/contracts/runtime.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapPiEvent, mapPiInput, renderPiToolResult } from '../../src/infrastructure/harnesses/pi/runtime.js';

const SESSION = { harness: 'pi', sessionId: 'pi-session-1', agentId: null } as const;

function toolOf(event: RuntimeEvent | null): unknown {
  return event !== null && 'tool' in event ? event.tool : null;
}

describe('Pi runtime event mapping (RF1, RF3, RF12, TC-33)', () => {
  it('maps tool_result fixtures and classifies the documented Pi tool names', async () => {
    const fixture = mapPiEvent('tool_result', await loadHarnessPayload('pi', 'tool-result.json'), SESSION);
    expect(toolOf(fixture)).toEqual({ name: 'bash', category: 'shell', paths: [], command: 'npm test' });
    expect(toolOf(mapPiEvent('tool_result', { toolName: 'bash', input: { command: 'ls' } }, SESSION))).toEqual({ name: 'bash', category: 'shell', paths: [], command: 'ls' });
    expect(toolOf(mapPiEvent('tool_result', { toolName: 'write', input: { path: 'src/a.ts' } }, SESSION))).toMatchObject({ category: 'file_write', paths: ['src/a.ts'] });
    expect(toolOf(mapPiEvent('tool_result', { toolName: 'read', input: { path: 'src/a.ts' } }, SESSION))).toMatchObject({ category: 'file_read' });
  });

  it('maps the documented tool_result fixture and counts input plus content characters', async () => {
    const payload = await loadHarnessPayload('pi', 'tool-result.json');
    const event = mapPiEvent('tool_result', payload, SESSION) as { kind: string; toolUseId: string | null };
    expect(event.kind).toBe('post_tool');
    expect(event.toolUseId).toBe('call_pi_result');
    const fixture = payload as { input: unknown; content: unknown };
    expect(mapPiInput('tool_result', payload).observedCharacters).toBe(JSON.stringify(fixture.input).length + JSON.stringify(fixture.content).length);
  });

  it('maps session_start, session_compact, and message_end', async () => {
    expect(mapPiEvent('session_start', { reason: 'new' }, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'new' });
    expect(mapPiEvent('session_start', { reason: 'startup' }, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'new' });
    expect(mapPiEvent('session_start', { reason: 'resume' }, SESSION)).toBeNull();
    expect(mapPiEvent('session_compact', {}, SESSION)).toEqual({ kind: 'session_reset', session: SESSION, reason: 'compact' });
    const message = await loadHarnessPayload('pi', 'message-end.json');
    expect(mapPiEvent('message_end', message, SESSION)).toEqual({ kind: 'response_end', session: SESSION, text: 'Checkpoint saved and committed.\n[REQUEST_SESSION_RESET]' });
    expect(mapPiEvent('message_end', { message: { role: 'user', content: [] } }, SESSION)).toBeNull();
  });

  it('rejects an invalid payload and ignores unknown events', () => {
    expect(() => mapPiEvent('tool_result', 'not-an-object', SESSION)).toThrow('The harness payload is invalid.');
    expect(mapPiEvent('before_agent_start', {}, SESSION)).toBeNull();
  });
});

describe('Pi runtime response rendering (RF14, RF17, TC-14)', () => {
  it('appends exactly one text part after the original content parts', async () => {
    const rendered = renderPiToolResult(await loadHarnessPayload('pi', 'tool-result.json'), 'telemetry');
    expect(rendered.content).toEqual([
      { type: 'text', text: 'tests passed' },
      { type: 'text', text: 'telemetry' },
    ]);
  });
});
