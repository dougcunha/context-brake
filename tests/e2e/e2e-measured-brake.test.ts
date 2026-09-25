import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { installedHookPath, runInstalledHook } from '../helpers/built-hook.js';
import { fixedClock, writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { installHarness } from '../support/harness-simulator/process-driver.js';

const SESSION = 'measured-e2e-claude';
const KEY: SessionKey = { harness: 'claude-code', sessionId: SESSION, agentId: null };
const WINDOW = 128_000;
const PRIOR_CALLS = 50;

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-measured-brake-'));
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/app.ts'), 'export const app = true;\n', 'utf8');
  await writeRuntimeConfig(root, WINDOW);
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await installHarness(root, 'claude-code');
  return root;
}
async function writeTranscript(path: string, tokens: number): Promise<void> {
  const usage = { input_tokens: 2, cache_creation_input_tokens: 1_000, cache_read_input_tokens: tokens - 1_002, output_tokens: 50 };
  const assistant = { type: 'assistant', isSidechain: false, timestamp: new Date().toISOString(), message: { role: 'assistant', content: [{ type: 'text', text: 'Synthetic.' }], usage } };
  await writeFile(path, `${JSON.stringify({ type: 'user', message: { role: 'user', content: 'Synthetic prompt.' } })}\n${JSON.stringify(assistant)}\n`, 'utf8');
}
function readPayload(transcriptPath: string, id: string): Record<string, unknown> {
  return { session_id: SESSION, transcript_path: transcriptPath, tool_name: 'Read', tool_input: { file_path: 'src/app.ts' }, tool_use_id: id };
}
function decisionOf(stdout: string): string | undefined {
  if (stdout === '') return undefined;
  return (JSON.parse(stdout) as { hookSpecificOutput?: { permissionDecision?: string } }).hookSpecificOutput?.permissionDecision;
}

describe('Claude Code brake by measured transcript usage (FR-01, FR-04, NFR-06, TC-18)', () => {
  const roots: string[] = [];
  afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }))); });

  it('allows a code read at 40% after 50 calls and denies it at 80% measured usage', async () => {
    const root = await createFixture();
    roots.push(root);
    const hook = installedHookPath('claude-code', root);
    const directory = join(root, 'transcripts com espaço', 'sessão');
    await mkdir(directory, { recursive: true });
    const transcript = join(directory, `${SESSION}.jsonl`);
    await writeTranscript(transcript, WINDOW * 0.4);
    for (let call = 1; call <= PRIOR_CALLS; call += 1) {
      expect(decisionOf((await runInstalledHook(hook, 'PreToolUse', readPayload(transcript, `toolu_${call}`))).stdout)).toBeUndefined();
      await runInstalledHook(hook, 'PostToolUse', { ...readPayload(transcript, `toolu_${call}`), tool_response: 'export const app = true;' });
    }
    expect(decisionOf((await runInstalledHook(hook, 'PreToolUse', readPayload(transcript, 'toolu_allowed'))).stdout)).toBeUndefined();
    const lines = await new NodeSessionLedger(root, fixedClock).readLines(KEY);
    const tools = lines.filter((line) => line.type === 'tool');
    expect(tools).toHaveLength(PRIOR_CALLS);
    expect(tools.every((line) => line.source === 'measured' && line.usedTokens === WINDOW * 0.4 && line.zone === 'GREEN')).toBe(true);
    await writeTranscript(transcript, WINDOW * 0.8);
    const denied = await runInstalledHook(hook, 'PreToolUse', readPayload(transcript, 'toolu_denied'));
    expect(decisionOf(denied.stdout)).toBe('deny');
    expect(denied.stdout).toContain('reason=critical_ceiling');
    const blocks = await readFile(join(root, '.context-brake/runtime/blocks.jsonl'), 'utf8');
    expect(`${blocks}${JSON.stringify(lines)}${denied.stdout}${denied.stderr}`).not.toContain('Synthetic');
  }, 180_000);
});
