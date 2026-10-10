import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ToolLine } from '../../src/core/contracts/session-ledger.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { fixedClock, writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { createOpenCodePlugin, mapOpenCodeSessionEvent, mapOpenCodeToolResult, openCodeObservedCharacters } from '../../src/infrastructure/harnesses/opencode/runtime.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const SESSION = { harness: 'opencode', sessionId: 'opencode-session-1', agentId: null } as const;
const FIXTURE_TOOL = { name: 'bash', category: 'shell', paths: [], command: 'npm test' };
const INVALID_PAYLOAD = 42;

describe('OpenCode runtime event mapping (RF1, RF3, RF14, TC-33)', () => {
  it('maps the documented tool.execute.after fixture, counts output.args characters, and tolerates undocumented input fields', async () => {
    const payload = await loadHarnessPayload('opencode', 'tool-execute-after.json') as { input: unknown; output: unknown };
    expect(mapOpenCodeToolResult(payload.input, payload.output, SESSION)).toEqual({ kind: 'post_tool', session: SESSION, tool: FIXTURE_TOOL, toolUseId: 'call_open_1' });
    expect(openCodeObservedCharacters(payload.output)).toBe(22);
    const undocumented = mapOpenCodeToolResult({ tool: 'read', sessionID: 's', callID: 'c', extra: true }, { args: { filePath: 'src/a.ts' } }, SESSION);
    expect(undocumented).toMatchObject({ tool: { category: 'file_read', paths: ['src/a.ts'] } });
    expect(mapOpenCodeToolResult({ tool: 'other' }, {}, SESSION)).toMatchObject({ tool: { category: 'other' } });
  });

  it('maps session.created and session.compacted events', async () => {
    expect(mapOpenCodeSessionEvent(await loadHarnessPayload('opencode', 'session-created.json'))).toEqual({ type: 'session.created', sessionId: 'opencode-session-1' });
    expect(mapOpenCodeSessionEvent(await loadHarnessPayload('opencode', 'session-compacted.json'))).toEqual({ type: 'session.compacted', sessionId: 'opencode-session-1' });
    expect(mapOpenCodeSessionEvent({ event: { type: 'session.idle' } })).toBeNull();
    expect(mapOpenCodeSessionEvent({})).toBeNull();
  });
});

const LIFECYCLE_KEY: SessionKey = { harness: 'opencode', sessionId: 'opencode-unit', agentId: null };

async function toolLines(root: string): Promise<ToolLine[]> {
  const lines = await new NodeSessionLedger(root, fixedClock).readLines(LIFECYCLE_KEY);
  return lines.filter((line): line is ToolLine => line.type === 'tool');
}

async function checkOpenCodeLifecycle(root: string): Promise<void> {
  const hooks = createOpenCodePlugin({ directory: root });
  expect('tool.execute.before' in hooks).toBe(false);
  const input = { tool: 'read', sessionID: LIFECYCLE_KEY.sessionId, callID: 'call-1' };
  await hooks['tool.execute.after']!(input, { args: { filePath: 'src/a.ts' } });
  expect(await toolLines(root)).toHaveLength(1);
  await hooks.event!({ event: { type: 'session.compacted', properties: { sessionID: LIFECYCLE_KEY.sessionId } } });
  await hooks['tool.execute.after']!({ ...input, callID: 'call-2' }, { args: { filePath: 'src/a.ts' } });
  expect((await toolLines(root)).at(-1)?.turn).toBe(1);
  await hooks.event!({ event: { type: 'session.created', properties: { sessionID: LIFECYCLE_KEY.sessionId } } });
  await hooks['tool.execute.after']!({ ...input, callID: 'call-3' }, { args: { filePath: 'src/a.ts' } });
  expect((await toolLines(root)).at(-1)?.turn).toBe(1);
  await hooks.event!({ event: { type: 'session.idle' } });
  await expect(hooks['tool.execute.after']!(INVALID_PAYLOAD, {})).resolves.toBeUndefined();
  await expect(hooks.event!(INVALID_PAYLOAD)).resolves.toBeUndefined();
  expect(await toolLines(root)).toHaveLength(3);
}

describe('OpenCode plugin lifecycle (RF1, RF3, DEC-13, prd-12 FR-07, TC-09)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t07-open-life-'));
    await writeRuntimeConfig(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('registers no pre-tool hook, counts one turn per completed call, resets on session.compacted and session.created, and ignores invalid payloads', async () => { await checkOpenCodeLifecycle(root); });
});
