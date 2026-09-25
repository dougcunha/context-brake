import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock, ToolLineInput } from '../../src/core/contracts/session-ledger.js';
import { nextTurn, summarizeLedger } from '../../src/core/services/session-counters.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { sessionsDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

const clock: Clock = { now: () => new Date('2026-09-15T12:00:00.000Z') };
const SESSIONS = 20;
const BUILT_HOOK = resolve('dist/assets/runtime/claude-code-hook.mjs');
const BUILT_TIMEOUT_MS = 120000;
const ROUNDS = 5;

function toolInput(turn: number, toolUseId: string): ToolLineInput {
  return { toolUseId, observedCharacters: 120, turn, usedTokens: 16000, windowTokens: 128000, estimatedTokens: 16000, source: 'estimated', zone: 'GREEN' };
}

describe('T03 concurrent appends (RF1, RF2, CA-06, TC-08)', () => {
  let tempDir: string;
  let ledger: NodeSessionLedger;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-parallel-'));
    ledger = new NodeSessionLedger(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('keeps one valid line per concurrent append and reports the fourth turn on the isolated read', async () => {
    for (let index = 0; index < SESSIONS; index += 1) {
      const key: SessionKey = { harness: 'claude-code', sessionId: `session-${index}`, agentId: null };
      await Promise.all([1, 2, 3].map((turn) => ledger.appendToolLine(key, toolInput(turn, `toolu-${index}-${turn}`))));
      const burst = summarizeLedger(await ledger.readLines(key));
      expect(burst.turns, `session-${index} burst`).toBe(3);
      await ledger.appendToolLine(key, toolInput(nextTurn(burst), `toolu-${index}-4`));
      const tools = (await ledger.readLines(key)).filter((line) => line.type === 'tool');
      expect(tools, `session-${index} total`).toHaveLength(4);
      expect(tools.at(-1)?.turn, `session-${index} reported turn`).toBe(4);
      expect(summarizeLedger(tools).turns, `session-${index} final count`).toBe(4);
    }
  });
});

type HookResult = { readonly code: number | null; readonly stdout: string };
function runBuiltHook(eventName: string, payload: unknown, projectRoot: string): Promise<HookResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [BUILT_HOOK, eventName], { cwd: projectRoot, env: { ...process.env, CLAUDE_PROJECT_DIR: projectRoot }, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stdin.end(JSON.stringify(payload));
    child.on('close', (code) => resolvePromise({ code, stdout }));
  });
}

async function prepareProject(root: string): Promise<void> {
  const config = { ...DEFAULT_CONFIG, activeHarnesses: ['claude-code' as const], telemetry: { ...DEFAULT_CONFIG.telemetry, contextWindowCeiling: 24000 } };
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
}

describe('T06 built Claude Code hooks count parallel calls (CA-06, TC-08)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t06-parallel-'));
    await prepareProject(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reports four turns on the isolated call after three concurrent hooks', async () => {
    for (let round = 0; round < ROUNDS; round += 1) {
      const session = { session_id: `built-session-${round}` };
      await Promise.all([1, 2, 3].map((call) => runBuiltHook('PostToolUse', { ...session, tool_use_id: `toolu-${round}-${call}` }, root)));
      const isolated = await runBuiltHook('PostToolUse', { ...session, tool_use_id: `toolu-${round}-4` }, root);
      expect(isolated.code).toBe(0);
      expect(isolated.stdout, `round ${round}`).toContain('turn=4 ');
      expect(isolated.stdout, `round ${round}`).toContain('zone=YELLOW');
    }
  }, BUILT_TIMEOUT_MS);

  it('keeps subagent turns in their own ledger', async () => {
    await runBuiltHook('PostToolUse', { session_id: 'main-session', tool_use_id: 'main-1' }, root);
    await Promise.all([1, 2, 3].map((call) => runBuiltHook('PostToolUse', { session_id: 'main-session', agent_id: 'sub-1', tool_use_id: `sub-${call}` }, root)));
    const main = await runBuiltHook('PostToolUse', { session_id: 'main-session', tool_use_id: 'main-2' }, root);
    expect(main.stdout).toContain('turn=2 ');
    const ledgers = await readdir(sessionsDirectory(root, 'claude-code'));
    expect(ledgers).toHaveLength(2);
  }, BUILT_TIMEOUT_MS);
});
