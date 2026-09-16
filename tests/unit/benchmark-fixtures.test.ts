import { describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { antigravityPreInvocationPayloadSchema } from '../../src/infrastructure/harnesses/antigravity-cli/schemas.js';
import { claudePreToolUsePayloadSchema } from '../../src/infrastructure/harnesses/claude-code/schemas.js';
import { codexPreToolUsePayloadSchema } from '../../src/infrastructure/harnesses/codex-cli/schemas.js';
import { cursorPreToolUsePayloadSchema } from '../../src/infrastructure/harnesses/cursor/schemas.js';
import { copilotPreToolUsePayloadSchema } from '../../src/infrastructure/harnesses/github-copilot-cli/schemas.js';
import { ompToolCallPayloadSchema } from '../../src/infrastructure/harnesses/oh-my-pi/schemas.js';
import { opencodeToolExecuteBeforePayloadSchema } from '../../src/infrastructure/harnesses/opencode/schemas.js';
import { piToolCallPayloadSchema } from '../../src/infrastructure/harnesses/pi/schemas.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

function payload(id: HarnessId): Record<string, unknown> {
  return getAdapter(id).benchmarkFixture().samplePayload as Record<string, unknown>;
}

function checkProcessPayloads(): void {
  const claude = claudePreToolUsePayloadSchema.parse(payload('claude-code'));
  expect(claude.tool_name).toBe('Bash');
  expect(claude.hook_event_name).toBe('PreToolUse');
  expect(codexPreToolUsePayloadSchema.parse(payload('codex-cli')).tool_name).toBe('Bash');
  const cursor = cursorPreToolUsePayloadSchema.parse(payload('cursor'));
  expect(cursor.conversation_id).toBe('bench-cursor');
  expect(cursor.hook_event_name).toBe('preToolUse');
  expect(copilotPreToolUsePayloadSchema.parse(payload('github-copilot-cli')).toolName).toBe('bash');
  const antigravity = antigravityPreInvocationPayloadSchema.parse(payload('antigravity-cli'));
  expect(antigravity.conversationId).toBe('bench-antigravity');
  expect(antigravity.invocationNum).toBe(1);
}

function checkInProcessPayloads(): void {
  expect(opencodeToolExecuteBeforePayloadSchema.parse(payload('opencode')).input?.tool).toBe('bash');
  expect(piToolCallPayloadSchema.parse(payload('pi')).input).toEqual({ path: 'file.txt' });
  expect(payload('pi').toolName).toBe('read');
  expect(ompToolCallPayloadSchema.parse(payload('oh-my-pi')).input).toEqual({ path: 'file.txt' });
  expect(payload('oh-my-pi').toolName).toBe('read');
}

describe('TC-04: adapter benchmark fixtures use documented payloads (FR-05)', () => {
  it('parses the five process event payloads with their adapter schemas', checkProcessPayloads);
  it('parses the three in-process payloads with their adapter schemas', checkInProcessPayloads);
});
