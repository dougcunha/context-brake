import { describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { antigravityPreInvocationPayloadSchema } from '../../src/infrastructure/harnesses/antigravity-cli/schemas.js';
import { claudePayloadSchema } from '../../src/infrastructure/harnesses/claude-code/schemas.js';
import { codexPostToolUsePayloadSchema } from '../../src/infrastructure/harnesses/codex-cli/schemas.js';
import { cursorPostToolUsePayloadSchema } from '../../src/infrastructure/harnesses/cursor/schemas.js';
import { copilotPostToolUsePayloadSchema } from '../../src/infrastructure/harnesses/github-copilot-cli/schemas.js';
import { ompToolResultPayloadSchema } from '../../src/infrastructure/harnesses/oh-my-pi/schemas.js';
import { opencodeToolExecuteAfterPayloadSchema } from '../../src/infrastructure/harnesses/opencode/schemas.js';
import { piToolResultPayloadSchema } from '../../src/infrastructure/harnesses/pi/schemas.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

function payload(id: HarnessId): Record<string, unknown> {
  return getAdapter(id).benchmarkFixture().samplePayload as Record<string, unknown>;
}

function checkProcessPayloads(): void {
  const claude = claudePayloadSchema.parse(payload('claude-code'));
  expect([claude.tool_name, claude.hook_event_name, claude.tool_response]).toEqual(['Bash', 'PostToolUse', 'file.txt']);
  expect(codexPostToolUsePayloadSchema.parse(payload('codex-cli')).tool_response).toBe('file.txt');
  const cursor = cursorPostToolUsePayloadSchema.parse(payload('cursor'));
  expect([cursor.conversation_id, cursor.hook_event_name, cursor.tool_output]).toEqual(['bench-cursor', 'postToolUse', 'file.txt']);
  expect(copilotPostToolUsePayloadSchema.parse(payload('github-copilot-cli')).toolName).toBe('bash');
  const antigravity = antigravityPreInvocationPayloadSchema.parse(payload('antigravity-cli'));
  expect(antigravity.conversationId).toBe('bench-antigravity');
  expect(antigravity.invocationNum).toBe(1);
}

function checkInProcessPayloads(): void {
  expect(opencodeToolExecuteAfterPayloadSchema.parse(payload('opencode')).input?.tool).toBe('bash');
  expect(piToolResultPayloadSchema.parse(payload('pi')).input).toEqual({ path: 'file.txt' });
  expect(payload('pi').toolName).toBe('read');
  expect(ompToolResultPayloadSchema.parse(payload('oh-my-pi')).input).toEqual({ path: 'file.txt' });
  expect(payload('oh-my-pi').toolName).toBe('read');
}

describe('TC-04: adapter benchmark fixtures use documented post-tool payloads (FR-05, prd-12 DEC-07)', () => {
  it('parses the five process event payloads with their adapter schemas', checkProcessPayloads);
  it('parses the three in-process payloads with their adapter schemas', checkInProcessPayloads);
});
