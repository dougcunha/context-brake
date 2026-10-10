import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runHookInProcess, type InProcessHookResult } from '../helpers/in-process-hook.js';
import { seedCriticalSession, writeInvalidRuntimeConfig } from '../helpers/runtime-seed.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

type ErrorRecord = { readonly event: string; readonly code: string };
let root = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-invalid-config-'));
  await writeInvalidRuntimeConfig(root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

function claude(event: string, sessionId: string): Promise<InProcessHookResult> {
  const payload = { session_id: sessionId, tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_response: 'x', tool_use_id: 'toolu_1' };
  return runHookInProcess({ harness: 'claude-code', projectRoot: root, event, payload });
}
async function errorRecords(): Promise<string[]> {
  const content = await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8');
  return content.trimEnd().split('\n').map((line) => JSON.parse(line) as ErrorRecord).map((record) => `${record.event} ${record.code}`);
}

describe('invalid configuration on the Claude Code hook (TC-04, RF19, CA-16, prd-12 TC-10)', () => {
  it('lets pre-tool calls below and at CRITICAL and a post-tool call proceed silently and records INVALID_CONFIG for each', async () => {
    await seedCriticalSession(root, { harness: 'claude-code', sessionId: 'critical', agentId: null });
    const results = [await claude('PreToolUse', 'green'), await claude('PreToolUse', 'critical'), await claude('PostToolUse', 'green')];
    expect(results.map(({ code, stdout }) => [code, stdout])).toEqual([[0, ''], [0, ''], [0, '']]);
    expect(await errorRecords()).toEqual(['PreToolUse INVALID_CONFIG', 'PreToolUse INVALID_CONFIG', 'post_tool INVALID_CONFIG']);
  });
});
