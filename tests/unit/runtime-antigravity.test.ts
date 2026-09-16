import { describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { mapAntigravityEvent, mapAntigravityInput, renderAntigravityDecision } from '../../src/infrastructure/harnesses/antigravity-cli/runtime.js';

const SESSION = { harness: 'antigravity-cli', sessionId: 'agy-conv-1', agentId: null };

describe('Antigravity CLI runtime event mapping (RF1, RF12, DEC-13, TC-33)', () => {
  it('maps the documented PreToolUse fixture and classifies run_command as a shell call', async () => {
    expect(mapAntigravityEvent('PreToolUse', await loadHarnessPayload('antigravity-cli', 'pre-tool-use.json'))).toEqual({ kind: 'pre_tool', session: SESSION, tool: { name: 'run_command', category: 'shell', paths: [], command: 'ls' } });
  });

  it('maps PostToolUse to a turn without a call identifier and PreInvocation to a context event', async () => {
    const post = mapAntigravityEvent('PostToolUse', await loadHarnessPayload('antigravity-cli', 'post-tool-use.json')) as { kind: string; toolUseId: string | null };
    expect(post.kind).toBe('post_tool');
    expect(post.toolUseId).toBeNull();
    expect(mapAntigravityEvent('PreInvocation', await loadHarnessPayload('antigravity-cli', 'pre-invocation.json'))).toEqual({ kind: 'pre_invocation', session: SESSION });
  });

  it('does not map Stop because the event carries no assistant text', async () => {
    expect(mapAntigravityEvent('Stop', await loadHarnessPayload('antigravity-cli', 'stop.json'))).toBeNull();
  });

  it('counts the documented toolCall args characters', async () => {
    const payload = await loadHarnessPayload('antigravity-cli', 'post-tool-use.json');
    expect(mapAntigravityInput('PostToolUse', payload).observedCharacters).toBe(JSON.stringify({ CommandLine: 'git status' }).length);
  });
});

describe('Antigravity CLI response rendering (RF14, RF17, DEC-14, TC-14)', () => {
  it('requires an explicit allow or deny on PreToolUse', () => {
    expect(JSON.parse(renderAntigravityDecision({ kind: 'neutral' }, 'PreToolUse') ?? '')).toEqual({ decision: 'allow' });
    expect(JSON.parse(renderAntigravityDecision({ kind: 'deny', tool: 'run_command', reason: 'critical_ceiling', message: 'BLOCKED' }, 'PreToolUse') ?? '')).toEqual({ decision: 'deny', reason: 'BLOCKED' });
  });

  it('answers PostToolUse with an empty object and PreInvocation with injectSteps', () => {
    expect(renderAntigravityDecision({ kind: 'neutral' }, 'PostToolUse')).toBe('{}');
    expect(JSON.parse(renderAntigravityDecision({ kind: 'context', block: 'telemetry' }, 'PreInvocation') ?? '')).toEqual({ injectSteps: [{ ephemeralMessage: 'telemetry' }] });
    expect(JSON.parse(renderAntigravityDecision({ kind: 'neutral' }, 'PreInvocation') ?? '')).toEqual({ injectSteps: [] });
    expect(renderAntigravityDecision({ kind: 'notify_user', text: 'notice' }, 'Stop')).toBeNull();
  });
});
