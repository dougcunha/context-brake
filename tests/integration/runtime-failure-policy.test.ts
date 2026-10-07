import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { seedCriticalSession, writeInvalidRuntimeConfig, writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { runtimeDirectory, sessionLedgerPath } from '../../src/infrastructure/runtime/runtime-paths.js';

let root = '';
let claudeHook = '';
let cursorHook = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-failure-policy-'));
  await writeInvalidRuntimeConfig(root);
  claudeHook = await installBuiltHook('claude-code', root);
  cursorHook = await installBuiltHook('cursor', root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('T06 failure policy below the ceiling (TC-18, CA-16)', () => {
  it('stays silent on Claude and Cursor post-tool calls with an invalid configuration', async () => {
    const claude = await runInstalledHook(claudeHook, 'PostToolUse', { session_id: 'green', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_response: 'x', tool_use_id: 'toolu_1' });
    expect([claude.code, claude.stdout]).toEqual([0, '']);
    const cursor = await runInstalledHook(cursorHook, 'postToolUse', { conversation_id: 'green', tool_name: 'Shell', tool_input: { command: 'ls' }, tool_output: 'x' });
    expect([cursor.code, cursor.stdout]).toEqual([0, '']);
  });

  it('treats an unreadable ledger as a recorded failure rather than a crash', async () => {
    await writeRuntimeConfig(root);
    await mkdir(sessionLedgerPath(root, { harness: 'claude-code', sessionId: 'unreadable', agentId: null }), { recursive: true });
    const result = await runInstalledHook(claudeHook, 'PostToolUse', { session_id: 'unreadable', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_response: 'x', tool_use_id: 'toolu_1' });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('LEDGER_UNREADABLE');
  });
});

describe('failure policy above the ceiling (prd-12 FR-07, TC-10)', () => {
  it('returns the neutral response in CRITICAL and records the error', async () => {
    await seedCriticalSession(root, { harness: 'claude-code', sessionId: 'critical', agentId: null });
    await seedCriticalSession(root, { harness: 'cursor', sessionId: 'critical', agentId: null });
    const claude = await runInstalledHook(claudeHook, 'PostToolUse', { session_id: 'critical', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_response: 'x', tool_use_id: 'toolu_13' });
    expect([claude.code, claude.stdout]).toEqual([0, '']);
    const cursor = await runInstalledHook(cursorHook, 'postToolUse', { conversation_id: 'critical', tool_name: 'Shell', tool_input: { command: 'rm -rf x' }, tool_output: 'x' });
    expect([cursor.code, cursor.stdout]).toEqual([0, '']);
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('INVALID_CONFIG');
  });
});
