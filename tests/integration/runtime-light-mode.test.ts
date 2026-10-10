import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { fixedClock, seedCriticalSession, writeRuntimeConfig } from '../helpers/runtime-seed.js';

type Handler = (input: unknown, output?: unknown) => Promise<unknown>;
const OPENCODE_ASSET = resolve('dist/assets/runtime/opencode-plugin.js');
const KEY: SessionKey = { harness: 'opencode', sessionId: 'opencode-critical', agentId: null };
const SEEDED_TURNS = 12;
let projectRoot: string;
beforeEach(async () => {
  projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'cb-light-')));
  await writeRuntimeConfig(projectRoot);
});
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('the built OpenCode plugin above the critical ceiling (FR-07, TC-09)', () => {
  it('registers no pre-tool hook and records a post-tool call above the critical ceiling', async () => {
    const module = (await import(pathToFileURL(OPENCODE_ASSET).href)) as { default: (context?: unknown) => Record<string, Handler> };
    const hooks = module.default({ directory: projectRoot });
    const after = await loadHarnessPayload('opencode', 'tool-execute-after.json') as { input: Record<string, unknown>; output: unknown };
    await seedCriticalSession(projectRoot, KEY);
    await hooks['tool.execute.after']!({ ...after.input, sessionID: KEY.sessionId }, after.output);
    const tools = (await new NodeSessionLedger(projectRoot, fixedClock).readLines(KEY)).filter((line) => line.type === 'tool');
    expect('tool.execute.before' in hooks).toBe(false);
    expect(tools).toHaveLength(SEEDED_TURNS + 1);
  });
});
