import { PassThrough } from 'node:stream';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { PayloadInvalidError } from '../../src/core/services/failure-policy.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { MAXIMUM_STDIN_BYTES, readStdinUpTo, runProcessHook, type ProcessHarnessAdapter, type ProcessHookContext } from '../../src/infrastructure/runtime/process-hook-host.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };
const POST_TOOL: RuntimeEvent = { kind: 'post_tool', session: KEY, tool: { name: 'Read', category: 'file_read', paths: ['src/app.ts'], command: null }, toolUseId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: [], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };
const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };
const NEUTRAL_RESPONSE = '{"kind":"neutral"}';

let root = '';
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t04-host-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

function toolInput(turn: number, zone: ToolLineInput['zone']): ToolLineInput {
  return { toolUseId: `toolu_${turn}`, observedCharacters: 0, turn, usedTokens: 0, windowTokens: 128000, estimatedTokens: 0, source: 'estimated', zone, windowOrigin: 'harness' };
}
function json(decision: RuntimeDecision): string {
  return JSON.stringify(decision);
}
type Captured = { readonly stdout: string[]; readonly stderr: string[]; readonly context: ProcessHookContext };
function capture(eventName: string, overrides: Partial<ProcessHookContext> = {}): Captured {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const context: ProcessHookContext = { argv: ['node', 'hook', eventName], readStdin: async () => '{}', writeStdout: (text) => { stdout.push(text); }, writeStderr: (text) => { stderr.push(text); }, deadlineMilliseconds: 1500, ...overrides };
  return { stdout, stderr, context };
}
function adapter(overrides: Partial<ProcessHarnessAdapter> = {}): ProcessHarnessAdapter {
  return { descriptor: DESCRIPTOR, mapEvent: (eventName) => (eventName === 'PostToolUse' ? POST_TOOL : null), mapInput: () => ({}), renderDecision: json, resolveProjectRoot: async () => root, ...overrides };
}
async function errorLog(): Promise<string> {
  return readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8');
}

describe('process hook host responses (CMP-17, TC-15)', () => {
  it.each([
    { label: 'a mapped event with the rendered decision', eventName: 'PostToolUse', stdin: '{"tool":"Read"}', render: json, stdout: [NEUTRAL_RESPONSE], payload: { tool: 'Read' } },
    { label: 'an unmapped event with malformed stdin as a neutral decision', eventName: 'PreToolUse', stdin: 'not json', render: json, stdout: [NEUTRAL_RESPONSE], payload: null },
    { label: 'a decision the harness renders as nothing with no output', eventName: 'PostToolUse', stdin: '{}', render: () => null, stdout: [], payload: {} },
  ])('answers $label, exits zero, and leaves stderr and the error log empty', async (row) => {
    const payloads: unknown[] = [];
    const { stdout, stderr, context } = capture(row.eventName, { readStdin: async () => row.stdin });
    const recording = adapter({ mapEvent: (eventName, payload) => { payloads.push(payload); return eventName === 'PostToolUse' ? POST_TOOL : null; }, renderDecision: row.render });
    expect(await runProcessHook(recording, context)).toBe(0);
    expect({ stdout, stderr, payloads }).toEqual({ stdout: row.stdout, stderr: [], payloads: [row.payload] });
    await expect(stat(join(runtimeDirectory(root), 'errors.jsonl'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('process hook host failure policy and input (DEC-09, DEC-11, TC-17)', () => {
  it.each([
    { label: 'an invalid payload', code: 'PAYLOAD_INVALID', failing: adapter({ mapEvent: () => { throw new PayloadInvalidError(); } }) },
    { label: 'an unresolvable project root', code: 'UNEXPECTED', failing: adapter({ resolveProjectRoot: async () => { throw new Error('boom'); } }) },
  ])('lets the tool call proceed after $label with a neutral response, exit zero, and the code on stderr (CMP-17, TC-15)', async ({ code, failing }) => {
    const { stdout, stderr, context } = capture('PostToolUse');
    expect(await runProcessHook(failing, context)).toBe(0);
    expect({ stdout, stderr }).toEqual({ stdout: [NEUTRAL_RESPONSE], stderr: [`ContextBrake: ${code}\n`] });
  });
  it('stays neutral and records the error when the configuration is invalid above the ceiling (prd-12 TC-10)', async () => {
    const ledger = new NodeSessionLedger(root, clock);
    for (let turn = 1; turn <= 12; turn += 1) await ledger.appendToolLine(KEY, toolInput(turn, turn === 12 ? 'CRITICAL' : 'RED'));
    await writeFile(join(root, 'context-brake.config.json'), '{"schemaVersion":1}', 'utf8');
    const { stdout, stderr, context } = capture('PostToolUse');
    expect(await runProcessHook(adapter(), context)).toBe(0);
    expect(JSON.parse(stdout[0] ?? '{}')).toEqual({ kind: 'neutral' });
    expect(stderr[0]).toContain('INVALID_CONFIG');
    expect(await errorLog()).toContain('"code":"INVALID_CONFIG"');
  });
  it('awaits an asynchronous input mapper that receives the runtime error log (DEC-11)', async () => {
    const { stdout, context } = capture('PostToolUse');
    const measuring = adapter({ mapInput: async (_event, _payload, errors) => { await errors.append('claude-code', { event: 'PostToolUse', code: 'UNEXPECTED', detail: 'probe' }); return { measured: { tokens: 120000, contextWindow: 128000 } }; } });
    expect(await runProcessHook(measuring, context)).toBe(0);
    expect(JSON.parse(stdout[0] ?? '{}')).toMatchObject({ kind: 'context', block: expect.stringContaining('source=measured') as unknown });
    expect(await errorLog()).toContain('"detail":"probe"');
  });
});

describe('process hook host stdin cap (CMP-17, acceptance)', () => {
  it('keeps the first bytes up to the maximum across chunks and caps the real stdin at 16 MiB', async () => {
    const stream = new PassThrough();
    const collected = readStdinUpTo(stream, 6);
    stream.write('0123');
    stream.write('4567');
    stream.end('89AB');
    expect(await collected).toBe('012345');
    expect(MAXIMUM_STDIN_BYTES).toBe(16_777_216);
  });
});
