import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  antigravityHooksFileSchema,
  antigravityPayloadSchema,
} from '../../src/infrastructure/harnesses/antigravity-cli/schemas.js';
import {
  claudePayloadSchema,
  claudePostToolUseResponseSchema,
  claudePreToolUseResponseSchema,
  claudeSettingsSchema,
} from '../../src/infrastructure/harnesses/claude-code/schemas.js';
import {
  codexHooksFileSchema,
  codexPayloadSchema,
} from '../../src/infrastructure/harnesses/codex-cli/schemas.js';
import {
  cursorHooksFileSchema,
  cursorPayloadSchema,
} from '../../src/infrastructure/harnesses/cursor/schemas.js';
import {
  copilotHooksFileSchema,
  copilotPayloadSchema,
} from '../../src/infrastructure/harnesses/github-copilot-cli/schemas.js';

describe('process harness schemas: Claude Code and Codex CLI (RF5, RF6)', () => {
  it('parses Claude Code settings and hook payloads non-strictly', () => {
    const settings = claudeSettingsSchema.parse({ hooks: { PreToolUse: [] }, extra: 1 });
    expect(settings.hooks?.PreToolUse).toHaveLength(0);
    const pre = claudePayloadSchema.parse({ session_id: 's1', tool_name: 'Bash' });
    expect(pre.tool_name).toBe('Bash');
    const post = claudePayloadSchema.parse({ session_id: 's1', tool_response: 'out', tool_use_id: 'toolu_1' });
    expect(post.tool_response).toBe('out');
    expect(post.tool_use_id).toBe('toolu_1');
    const preResp = claudePreToolUseResponseSchema.parse({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny' } });
    expect(preResp.hookSpecificOutput?.permissionDecision).toBe('deny');
    const postResp = claudePostToolUseResponseSchema.parse({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'ctx' } });
    expect(postResp.hookSpecificOutput?.additionalContext).toBe('ctx');
  });

  it('rejects Claude Code hook-specific output without the matching hookEventName', () => {
    expect(claudePreToolUseResponseSchema.safeParse({ hookSpecificOutput: { permissionDecision: 'deny' } }).success).toBe(false);
    expect(claudePreToolUseResponseSchema.safeParse({ hookSpecificOutput: { hookEventName: 'PostToolUse' } }).success).toBe(false);
    expect(claudePostToolUseResponseSchema.safeParse({ hookSpecificOutput: { additionalContext: 'ctx' } }).success).toBe(false);
  });

  it('parses Codex CLI hooks and payloads non-strictly', () => {
    const hooks = codexHooksFileSchema.parse({ hooks: { PreToolUse: [] } });
    expect(hooks.hooks?.PreToolUse).toHaveLength(0);
    const pre = codexPayloadSchema.parse({ session_id: 's2', tool_name: 'apply_patch' });
    expect(pre.session_id).toBe('s2');
    const post = codexPayloadSchema.parse({ tool_response: { status: 'ok' }, tool_use_id: 'call_1' });
    expect(post.tool_response).toBeDefined();
    expect(post.tool_use_id).toBe('call_1');
  });
});

describe('process harness schemas: Cursor, Copilot, and Antigravity (RF5, RF6)', () => {
  it('parses Cursor hooks and payloads non-strictly', () => {
    const config = cursorHooksFileSchema.parse({ version: 1, hooks: { preToolUse: [{ command: 'c', failClosed: true }] } });
    expect(config.version).toBe(1);
    const pre = cursorPayloadSchema.parse({ conversation_id: 'c1', tool_name: 'Shell' });
    expect(pre.conversation_id).toBe('c1');
    const compact = cursorPayloadSchema.parse({ context_usage_percent: 72, context_tokens: 92000, context_window_size: 128000, trigger: 'auto' });
    expect(compact.context_usage_percent).toBe(72);
  });

  it('parses Copilot CLI hooks and Antigravity hooks non-strictly', () => {
    const copilot = copilotHooksFileSchema.parse({ version: 1, hooks: { preToolUse: [{ exec: 'node' }] } });
    expect(copilot.version).toBe(1);
    expect(copilotPayloadSchema.parse({ sessionId: 'cp1' }).sessionId).toBe('cp1');
    expect(copilotPayloadSchema.parse({ sessionId: 'cp1', toolResult: { textResultForLlm: 'out' } }).sessionId).toBe('cp1');
    const agy = antigravityHooksFileSchema.parse({ 'context-brake': { PreInvocation: [{ command: 'node' }] } });
    expect(agy['context-brake']?.PreInvocation).toBeDefined();
    expect(antigravityPayloadSchema.parse({ invocationNum: 2 }).invocationNum).toBe(2);
  });

  it('parses the documented Antigravity PreToolUse fixture with toolCall.name/args (FR-06, TC-01)', async () => {
    const raw = await readFile('tests/fixtures/harnesses/antigravity-cli/pre-tool-use.json', 'utf8');
    const payload = antigravityPayloadSchema.parse(JSON.parse(raw));
    expect(payload.conversationId).toBe('agy-conv-1');
    expect(payload.toolCall?.name).toBe('run_command');
    expect(payload.toolCall?.args).toEqual({ CommandLine: 'ls' });
    expect((payload as Record<string, unknown>).extraField).toBe('ignored');
  });
});
