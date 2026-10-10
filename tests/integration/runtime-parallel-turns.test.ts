import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';

const BUILT_HOOK = resolve('dist/assets/runtime/claude-code-hook.mjs');
const BUILT_TIMEOUT_MS = 120000;
const ROUNDS = 5;

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

describe('built Claude Code hooks count parallel calls (RF1, RF2, CA-06, TC-08)', () => {
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
});
