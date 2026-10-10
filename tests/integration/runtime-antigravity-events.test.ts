import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapAntigravityEvent, mapAntigravityInput, renderAntigravityDecision } from '../../src/infrastructure/harnesses/antigravity-cli/runtime.js';

const SESSION = { harness: 'antigravity-cli', sessionId: 'agy-conv-1', agentId: null };

describe('Antigravity CLI runtime event mapping (RF1, RF12, DEC-13, TC-33)', () => {
  it('maps the documented PostToolUse and PreInvocation fixtures, ignores PreToolUse, and does not map Stop because it carries no assistant text', async () => {
    expect(mapAntigravityEvent('PostToolUse', await loadHarnessPayload('antigravity-cli', 'post-tool-use.json'))).toEqual({ kind: 'post_tool', session: SESSION, tool: { name: 'run_command', category: 'shell', paths: [], command: 'git status' }, toolUseId: null });
    expect(mapAntigravityEvent('PreInvocation', await loadHarnessPayload('antigravity-cli', 'pre-invocation.json'))).toEqual({ kind: 'pre_invocation', session: SESSION });
    expect(mapAntigravityEvent('PreToolUse', { conversationId: 'agy-conv-1' })).toBeNull();
    expect(mapAntigravityEvent('Stop', await loadHarnessPayload('antigravity-cli', 'stop.json'))).toBeNull();
  });

  it('counts the documented toolCall args characters', async () => {
    const payload = await loadHarnessPayload('antigravity-cli', 'post-tool-use.json');
    expect(mapAntigravityInput('PostToolUse', payload)).toEqual({ observedCharacters: 28 });
  });
});

describe('Antigravity CLI response rendering (RF14, RF17, DEC-14, TC-14)', () => {
  it('answers PostToolUse with an empty object and PreInvocation with injectSteps', () => {
    expect(renderAntigravityDecision({ kind: 'neutral' }, 'PostToolUse')).toBe('{}');
    expect(JSON.parse(renderAntigravityDecision({ kind: 'context', block: 'telemetry' }, 'PreInvocation') ?? '')).toEqual({ injectSteps: [{ ephemeralMessage: 'telemetry' }] });
    expect(JSON.parse(renderAntigravityDecision({ kind: 'neutral' }, 'PreInvocation') ?? '')).toEqual({ injectSteps: [] });
  });
});
