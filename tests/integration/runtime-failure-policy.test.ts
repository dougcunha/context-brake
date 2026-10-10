import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { runHookInProcess, type InProcessHookResult } from '../helpers/in-process-hook.js';
import { seedCriticalSession, writeInvalidRuntimeConfig, writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { runtimeDirectory, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

const SESSIONS = ['green', 'critical'];
let root = '';
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-failure-policy-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function cursorPost(sessionId: string): Promise<InProcessHookResult> {
  const payload = { ...(await loadHarnessPayload('cursor', 'post-tool-use.json') as object), conversation_id: sessionId };
  return runHookInProcess({ harness: 'cursor', projectRoot: root, event: 'postToolUse', payload });
}
async function copilotPost(sessionId: string): Promise<InProcessHookResult> {
  const payload = { ...(await loadHarnessPayload('github-copilot-cli', 'post-tool-use.json') as object), sessionId };
  return runHookInProcess({ harness: 'github-copilot-cli', projectRoot: root, event: 'postToolUse', payload });
}
function errorLog(): Promise<string> {
  return readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8');
}

describe('failure policy on the process hooks below and above the ceiling (TC-18, RF19, CA-16, prd-12 FR-07, TC-10)', () => {
  it('lets Cursor and Copilot post-tool calls proceed silently in GREEN and CRITICAL with an invalid configuration', async () => {
    await writeInvalidRuntimeConfig(root);
    await seedCriticalSession(root, { harness: 'cursor', sessionId: 'critical', agentId: null });
    await seedCriticalSession(root, { harness: 'github-copilot-cli', sessionId: 'critical', agentId: null });
    const results: InProcessHookResult[] = [];
    for (const session of SESSIONS) results.push(await cursorPost(session), await copilotPost(session));
    expect(results.map(({ code, stdout }) => [code, stdout])).toEqual(Array.from({ length: 4 }, () => [0, '']));
    expect((await errorLog()).match(/"code":"INVALID_CONFIG"/g)).toHaveLength(4);
  });

  it('treats an unreadable ledger as a recorded failure rather than a crash', async () => {
    await writeRuntimeConfig(root);
    await mkdir(sessionLedgerPath(root, { harness: 'claude-code', sessionId: 'unreadable', agentId: null }), { recursive: true });
    const payload = { session_id: 'unreadable', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_response: 'x', tool_use_id: 'toolu_1' };
    const result = await runHookInProcess({ harness: 'claude-code', projectRoot: root, event: 'PostToolUse', payload });
    expect([result.code, result.stdout]).toEqual([0, '']);
    expect(await errorLog()).toContain('"code":"LEDGER_UNREADABLE"');
  });
});
