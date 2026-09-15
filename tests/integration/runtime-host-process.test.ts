import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

const HOST_ENTRY = resolve('tests/fixtures/runtime-host/host-entry.ts');
const SPAWN_TIMEOUT_MS = 20000;
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };

type Result = { readonly code: number | null; readonly stdout: string; readonly stderr: string };
function runHost(eventName: string, payload: unknown, projectRoot: string): Promise<Result> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ['--import', 'tsx', HOST_ENTRY, eventName], { cwd: process.cwd(), env: { ...process.env, CB_TEST_ROOT: projectRoot }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.stdin.end(JSON.stringify(payload));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
  });
}
function toolInput(turn: number, zone: ToolLineInput['zone'] = 'GREEN'): ToolLineInput {
  return { toolUseId: `toolu_${turn}`, observedCharacters: 0, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone };
}
async function seedCriticalSession(projectRoot: string): Promise<void> {
  const ledger = new NodeSessionLedger(projectRoot, clock);
  for (let turn = 1; turn <= 12; turn += 1) await ledger.appendToolLine(KEY, toolInput(turn, turn === 12 ? 'CRITICAL' : 'RED'));
}

describe('process hook host end to end (CMP-17, TC-15, TC-16)', () => {
  let projectRoot: string;
  beforeEach(async () => { projectRoot = await mkdtemp(join(tmpdir(), 'cb-t04-e2e-')); });
  afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('denies a code read above the ceiling, records the block, and exits zero', async () => {
    await seedCriticalSession(projectRoot);
    const result = await runHost('PreToolUse', { session_id: 'session-1', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_use_id: 'toolu_x' }, projectRoot);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const decision = JSON.parse(result.stdout) as { kind: string; message?: string };
    expect(decision.kind).toBe('deny');
    expect(decision.message).toContain('reason=critical_ceiling');
    expect(await readFile(join(runtimeDirectory(projectRoot), 'blocks.jsonl'), 'utf8')).toContain('"tool":"Read"');
  }, SPAWN_TIMEOUT_MS);

  it('returns neutral below the ceiling and appends the tool line', async () => {
    const result = await runHost('PostToolUse', { session_id: 'session-1', tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_use_id: 'toolu_1' }, projectRoot);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ kind: 'neutral' });
    const lines = await new NodeSessionLedger(projectRoot, clock).readLines(KEY);
    expect(lines.map((line) => line.type)).toEqual(['session', 'tool']);
  }, SPAWN_TIMEOUT_MS);
});

describe('process hook host end to end events (CMP-17, RF22)', () => {
  let projectRoot: string;
  beforeEach(async () => { projectRoot = await mkdtemp(join(tmpdir(), 'cb-t04-e2e2-')); });
  afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('answers unknown events with a neutral response', async () => {
    const result = await runHost('UnknownEvent', {}, projectRoot);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ kind: 'neutral' });
  }, SPAWN_TIMEOUT_MS);

  it('notifies the new-session command when the response ends with the signal', async () => {
    const result = await runHost('Stop', { session_id: 'session-1', last_assistant_message: '[REQUEST_SESSION_RESET]' }, projectRoot);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ kind: 'notify_user', text: 'ContextBrake: the agent requested a session reset. Run /clear to start a new session.' });
  }, SPAWN_TIMEOUT_MS);
});
