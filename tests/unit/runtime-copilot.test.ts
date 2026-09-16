import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapCopilotEvent, mapCopilotInput, renderCopilotDecision } from '../../src/infrastructure/harnesses/github-copilot-cli/runtime.js';

const SESSION = { harness: 'github-copilot-cli', sessionId: 'copilot-s-1', agentId: null };

describe('GitHub Copilot CLI runtime event mapping (RF3, RF12, DEC-13, TC-33)', () => {
  it('maps the captured preToolUse fixture and classifies both documented shell tools', async () => {
    const captured = await loadHarnessPayload('github-copilot-cli', 'pre-tool-use.json');
    expect(mapCopilotEvent('preToolUse', captured)).toEqual({ kind: 'pre_tool', session: SESSION, tool: { name: 'powershell', category: 'shell', paths: [], command: 'git status' } });
    expect(mapCopilotEvent('preToolUse', { sessionId: 'copilot-s-1', toolName: 'bash', toolArgs: { command: 'ls' } })).toMatchObject({ tool: { name: 'bash', category: 'shell', command: 'ls' } });
  });

  it('classifies edit, create, and view tools from their path field', () => {
    expect(mapCopilotEvent('preToolUse', { sessionId: 'copilot-s-1', toolName: 'edit', toolArgs: { path: 'src/a.ts' } })).toMatchObject({ tool: { category: 'file_write', paths: ['src/a.ts'] } });
    expect(mapCopilotEvent('preToolUse', { sessionId: 'copilot-s-1', toolName: 'view', toolArgs: { path: 'src/a.ts' } })).toMatchObject({ tool: { category: 'file_read', paths: ['src/a.ts'] } });
  });

  it('maps the documented postToolUse fixture and counts its toolResult characters', async () => {
    const payload = await loadHarnessPayload('github-copilot-cli', 'post-tool-use.json');
    const event = mapCopilotEvent('postToolUse', payload) as { kind: string; toolUseId: string | null };
    expect(event.kind).toBe('post_tool');
    expect(event.toolUseId).toBeNull();
    const fixture = payload as { toolArgs: unknown; toolResult: { textResultForLlm: string } };
    expect(mapCopilotInput('postToolUse', payload).observedCharacters).toBe(JSON.stringify(fixture.toolArgs).length + fixture.toolResult.textResultForLlm.length);
  });

  it('resets on startup, new, and preCompact but not on resume', async () => {
    expect(mapCopilotEvent('sessionStart', await loadHarnessPayload('github-copilot-cli', 'session-start.json'))).toEqual({ kind: 'session_reset', session: SESSION, reason: 'new' });
    expect(mapCopilotEvent('sessionStart', { sessionId: 'copilot-s-1', source: 'resume' })).toBeNull();
    expect(mapCopilotEvent('preCompact', await loadHarnessPayload('github-copilot-cli', 'pre-compact.json'))).toEqual({ kind: 'session_reset', session: SESSION, reason: 'compact' });
  });
});

describe('GitHub Copilot CLI response rendering (RF14, RF17, TC-14)', () => {
  it('renders deny and additionalContext without ever touching the tool result', () => {
    expect(JSON.parse(renderCopilotDecision({ kind: 'deny', tool: 'bash', reason: 'critical_ceiling', message: 'BLOCKED' }) ?? '')).toEqual({ permissionDecision: 'deny', permissionDecisionReason: 'BLOCKED' });
    expect(JSON.parse(renderCopilotDecision({ kind: 'context', block: 'telemetry' }) ?? '')).toEqual({ additionalContext: 'telemetry' });
    expect(renderCopilotDecision({ kind: 'context', block: 'telemetry' })).not.toContain('modifiedResult');
    expect(renderCopilotDecision({ kind: 'neutral' })).toBeNull();
    expect(renderCopilotDecision({ kind: 'notify_user', text: 'notice' })).toBeNull();
  });
});
