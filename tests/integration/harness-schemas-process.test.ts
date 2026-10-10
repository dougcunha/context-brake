import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { antigravityPayloadSchema } from '../../src/infrastructure/harnesses/antigravity-cli/schemas.js';

describe('process harness payload schemas (RF5, RF6)', () => {
  it('parses the documented Antigravity PostToolUse fixture with toolCall.name/args (FR-06, TC-01)', async () => {
    const raw = await readFile('tests/fixtures/harnesses/antigravity-cli/post-tool-use.json', 'utf8');
    const payload = antigravityPayloadSchema.parse(JSON.parse(raw));
    expect(payload.conversationId).toBe('agy-conv-1');
    expect(payload.toolCall?.name).toBe('run_command');
    expect(payload.toolCall?.args).toEqual({ CommandLine: 'git status' });
    expect((payload as Record<string, unknown>).hookName).toBe('PostToolUse');
  });
});
