import { describe, expect, it } from 'vitest';
import {
  antigravityHooksFileSchema,
  antigravityPreInvocationPayloadSchema,
  antigravityPreToolUsePayloadSchema,
} from '../../src/infrastructure/harnesses/antigravity-cli/schemas.js';
import {
  claudePostToolUsePayloadSchema,
  claudePostToolUseResponseSchema,
  claudePreToolUsePayloadSchema,
  claudePreToolUseResponseSchema,
  claudeSettingsSchema,
} from '../../src/infrastructure/harnesses/claude-code/schemas.js';
import {
  codexHooksFileSchema,
  codexPostToolUsePayloadSchema,
  codexPreToolUsePayloadSchema,
} from '../../src/infrastructure/harnesses/codex-cli/schemas.js';
import {
  cursorHooksFileSchema,
  cursorPostToolUsePayloadSchema,
  cursorPreToolUsePayloadSchema,
} from '../../src/infrastructure/harnesses/cursor/schemas.js';
import {
  copilotHooksFileSchema,
  copilotPostToolUsePayloadSchema,
  copilotPreToolUsePayloadSchema,
} from '../../src/infrastructure/harnesses/github-copilot-cli/schemas.js';

describe('process harness schemas: Claude Code and Codex CLI (RF5, RF6)', () => {
  it('parses Claude Code settings and hook payloads non-strictly', () => {
    const settings = claudeSettingsSchema.parse({ hooks: { PreToolUse: [] }, extra: 1 });
    expect(settings.hooks?.PreToolUse).toHaveLength(0);
    const pre = claudePreToolUsePayloadSchema.parse({ session_id: 's1', tool_name: 'Bash' });
    expect(pre.tool_name).toBe('Bash');
    const post = claudePostToolUsePayloadSchema.parse({ session_id: 's1', tool_output: 'out' });
    expect(post.tool_output).toBe('out');
    const preResp = claudePreToolUseResponseSchema.parse({ hookSpecificOutput: { permissionDecision: 'allow' } });
    expect(preResp.hookSpecificOutput?.permissionDecision).toBe('allow');
    const postResp = claudePostToolUseResponseSchema.parse({ hookSpecificOutput: { additionalContext: 'ctx' } });
    expect(postResp.hookSpecificOutput?.additionalContext).toBe('ctx');
  });

  it('parses Codex CLI hooks and payloads non-strictly', () => {
    const hooks = codexHooksFileSchema.parse({ hooks: { PreToolUse: [] } });
    expect(hooks.hooks?.PreToolUse).toHaveLength(0);
    const pre = codexPreToolUsePayloadSchema.parse({ session_id: 's2', tool_name: 'patch' });
    expect(pre.session_id).toBe('s2');
    const post = codexPostToolUsePayloadSchema.parse({ tool_response: { status: 'ok' } });
    expect(post.tool_response).toBeDefined();
  });
});

describe('process harness schemas: Cursor, Copilot, and Antigravity (RF5, RF6)', () => {
  it('parses Cursor hooks and payloads non-strictly', () => {
    const config = cursorHooksFileSchema.parse({ version: 1, hooks: { preToolUse: [{ command: 'c', failClosed: true }] } });
    expect(config.version).toBe(1);
    const pre = cursorPreToolUsePayloadSchema.parse({ conversation_id: 'c1', tool_name: 'read' });
    expect(pre.conversation_id).toBe('c1');
    const post = cursorPostToolUsePayloadSchema.parse({ tool_output: 'data' });
    expect(post.tool_output).toBe('data');
  });

  it('parses Copilot CLI hooks and Antigravity hooks non-strictly', () => {
    const copilot = copilotHooksFileSchema.parse({ version: 1, hooks: { preToolUse: [{ exec: 'node' }] } });
    expect(copilot.version).toBe(1);
    expect(copilotPreToolUsePayloadSchema.parse({ sessionId: 'cp1' }).sessionId).toBe('cp1');
    expect(copilotPostToolUsePayloadSchema.parse({ sessionId: 'cp1' }).sessionId).toBe('cp1');
    const agy = antigravityHooksFileSchema.parse({ hooks: { PreToolUse: { 'context-brake': { command: 'node' } } } });
    expect(agy.hooks?.PreToolUse?.['context-brake']?.command).toBe('node');
    expect(antigravityPreToolUsePayloadSchema.parse({ conversationId: 'a1' }).conversationId).toBe('a1');
    expect(antigravityPreInvocationPayloadSchema.parse({ invocationNum: 2 }).invocationNum).toBe(2);
  });
});
