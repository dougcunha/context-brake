import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { installBuiltHook, runInstalledHook } from '../helpers/built-hook.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { writeRuntimeConfig } from '../helpers/runtime-seed.js';

const POST_TOOL_EVENTS: ReadonlyArray<readonly [HarnessId, string]> = [
  ['claude-code', 'PostToolUse'],
  ['codex-cli', 'PostToolUse'],
  ['cursor', 'postToolUse'],
  ['github-copilot-cli', 'postToolUse'],
  ['antigravity-cli', 'PostToolUse'],
];
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-smoke-hook-'));
  await writeRuntimeConfig(root);
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function ledgerLines(harness: HarnessId): Promise<string[]> {
  const directory = join(root, '.context-brake', 'runtime', 'sessions', harness);
  const files = await readdir(directory).catch(() => [] as string[]);
  const contents = await Promise.all(files.map((file) => readFile(join(directory, file), 'utf8')));
  return contents.flatMap((content) => content.split('\n')).filter((line) => line !== '');
}

describe('built process hook round trip per harness (prd-13 FR-04, DEC-03)', () => {
  it.each(POST_TOOL_EVENTS)('%s: the built hook reads the documented post-tool payload and records the call', async (harness, event) => {
    const hook = await installBuiltHook(harness, root);
    const result = await runInstalledHook(hook, event, await loadHarnessPayload(harness, 'post-tool-use.json'));
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect((await ledgerLines(harness)).some((line) => line.includes('"type":"tool"'))).toBe(true);
  });
});
