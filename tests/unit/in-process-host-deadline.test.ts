import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../src/core/contracts/runtime.js';
import { createInProcessRuntime } from '../../src/infrastructure/runtime/in-process-host.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';

const KEY: SessionKey = { harness: 'pi', sessionId: 'inproc-deadline', agentId: null };
const DESCRIPTOR: RuntimeDescriptor = { harness: 'pi', capabilities: [{ id: 'session_boot', state: 'supported' }], estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: null };
const LIMITS = { event: 1, sessionStart: 60_000 };

let root = '';

beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-in-process-deadline-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function errorLines(): Promise<Record<string, unknown>[]> {
  const text = await readFile(join(runtimeDirectory(root), 'errors.jsonl'), 'utf8').catch(() => '');
  return text.split('\n').filter((line) => line !== '').map((line) => JSON.parse(line) as Record<string, unknown>);
}
function handle(event: RuntimeEvent): Promise<unknown> {
  return createInProcessRuntime({ projectRoot: root, descriptor: DESCRIPTOR, config: DEFAULT_CONFIG, deadlines: LIMITS }).handle(event);
}

describe('in-process deadline selection (FR-10, FR-11, DEC-11, DEC-12, TC-15)', () => {
  it('gives the session start its own limit, so the same work passes there and fails as a tool call', async () => {
    expect(await handle({ kind: 'session_reset', session: KEY, reason: 'new' })).toEqual({ kind: 'neutral' });
    expect(await errorLines()).toEqual([]);
    await handle({ kind: 'pre_tool', session: KEY, tool: { name: 'Read', category: 'file_read', paths: [], command: null } });
    const [line] = await errorLines();
    expect(line).toMatchObject({ event: 'pre_tool', code: 'DEADLINE_EXCEEDED', phase: 'engine' });
    expect(line?.['elapsedMs']).toEqual(expect.any(Number));
    expect(Number.isInteger(line?.['elapsedMs'])).toBe(true);
    expect(line?.['elapsedMs']).toBeGreaterThanOrEqual(0);
  });
});
