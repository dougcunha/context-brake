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
  it('lets the Claude call proceed and answers Cursor with an explicit allow', async () => {
    const claude = await runInstalledHook(claudeHook, 'PreToolUse', { session_id: 'green', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } });
    expect(claude.code).toBe(0);
    expect(claude.stdout).toBe('');
    const cursor = await runInstalledHook(cursorHook, 'preToolUse', { conversation_id: 'green', tool_name: 'Shell', tool_input: { command: 'rm -rf x' } });
    expect(cursor.code).toBe(0);
    expect(JSON.parse(cursor.stdout)).toEqual({ permission: 'allow' });
  });

  it('treats an unreadable ledger as a recorded failure rather than a crash', async () => {
    await writeRuntimeConfig(root);
    await mkdir(sessionLedgerPath(root, { harness: 'claude-code', sessionId: 'unreadable', agentId: null }), { recursive: true });
    const result = await runInstalledHook(claudeHook, 'PreToolUse', { session_id: 'unreadable', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8')).toContain('LEDGER_UNREADABLE');
  });
});

describe('T06 failure policy above the ceiling (TC-18, CA-16)', () => {
  it('denies non-allowlisted calls in each harness deny shape but keeps the allowlist', async () => {
    await seedCriticalSession(root, { harness: 'claude-code', sessionId: 'critical', agentId: null });
    await seedCriticalSession(root, { harness: 'cursor', sessionId: 'critical', agentId: null });
    const claude = await runInstalledHook(claudeHook, 'PreToolUse', { session_id: 'critical', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } });
    expect((JSON.parse(claude.stdout) as { hookSpecificOutput: { permissionDecision: string } }).hookSpecificOutput.permissionDecision).toBe('deny');
    const claudeGit = await runInstalledHook(claudeHook, 'PreToolUse', { session_id: 'critical', tool_name: 'Bash', tool_input: { command: 'git add src/a.ts' } });
    expect(claudeGit.stdout).toBe('');
    const cursor = await runInstalledHook(cursorHook, 'preToolUse', { conversation_id: 'critical', tool_name: 'Shell', tool_input: { command: 'rm -rf x' } });
    expect((JSON.parse(cursor.stdout) as { permission: string }).permission).toBe('deny');
    const cursorGit = await runInstalledHook(cursorHook, 'preToolUse', { conversation_id: 'critical', tool_name: 'Shell', tool_input: { command: 'git commit -m "checkpoint"' } });
    expect(JSON.parse(cursorGit.stdout)).toEqual({ permission: 'allow' });
  });
});
