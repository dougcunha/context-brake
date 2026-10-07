import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ToolLine } from '../../src/core/contracts/session-ledger.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { fixedClock, writeRuntimeConfig } from '../helpers/runtime-seed.js';
import { createOpenCodePlugin, mapOpenCodeSessionEvent, mapOpenCodeToolResult, openCodeDescriptor, openCodeObservedCharacters } from '../../src/infrastructure/harnesses/opencode/runtime.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';

const SESSION = { harness: 'opencode', sessionId: 'opencode-session-1', agentId: null } as const;

describe('OpenCode runtime event mapping (RF1, RF3, RF14, TC-33)', () => {
  it('maps the documented tool.execute.after fixture and counts output.args characters', async () => {
    const payload = await loadHarnessPayload('opencode', 'tool-execute-after.json') as { input: unknown; output: unknown };
    const event = mapOpenCodeToolResult(payload.input, payload.output, SESSION) as { kind: string; toolUseId: string | null };
    expect(event.kind).toBe('post_tool');
    expect(event.toolUseId).toBe('call_open_1');
    expect(openCodeObservedCharacters(payload.output)).toBe(JSON.stringify({ command: 'npm test' }).length);
  });

  it('maps session.created and session.compacted events', async () => {
    expect(mapOpenCodeSessionEvent(await loadHarnessPayload('opencode', 'session-created.json'))).toEqual({ type: 'session.created', sessionId: 'opencode-session-1' });
    expect(mapOpenCodeSessionEvent(await loadHarnessPayload('opencode', 'session-compacted.json'))).toEqual({ type: 'session.compacted', sessionId: 'opencode-session-1' });
    expect(mapOpenCodeSessionEvent({ event: { type: 'session.idle' } })).toBeNull();
    expect(mapOpenCodeSessionEvent({})).toBeNull();
  });

  it('tolerates undocumented and unknown payload fields', () => {
    const event = mapOpenCodeToolResult({ tool: 'read', sessionID: 's', callID: 'c', extra: true }, { args: { filePath: 'src/a.ts' } }, SESSION);
    expect(event).toMatchObject({ tool: { category: 'file_read', paths: ['src/a.ts'] } });
    expect(mapOpenCodeToolResult({ tool: 'other' }, {}, SESSION)).toMatchObject({ tool: { category: 'other' } });
  });
});

describe('OpenCode plugin factory and partial profile (RF21, prd-12 TC-11)', () => {
  it('keeps the partial profile and no new-session command', () => {
    expect(openCodeDescriptor.newSessionCommand).toBeNull();
    expect(openCodeDescriptor.capabilities.find((capability) => capability.id === 'post_tool_telemetry')?.state).toBe('unsupported');
  });

  it('exposes tool.execute.after and an event handler, and no pre-tool hook (prd-12 FR-07, TC-09)', () => {
    const hooks = createOpenCodePlugin({ directory: process.cwd() });
    expect('tool.execute.before' in hooks).toBe(false);
    expect(typeof hooks['tool.execute.after']).toBe('function');
    expect(typeof hooks.event).toBe('function');
  });
});

const LIFECYCLE_KEY: SessionKey = { harness: 'opencode', sessionId: 'opencode-unit', agentId: null };

async function toolLines(root: string): Promise<ToolLine[]> {
  const lines = await new NodeSessionLedger(root, fixedClock).readLines(LIFECYCLE_KEY);
  return lines.filter((line): line is ToolLine => line.type === 'tool');
}

async function checkOpenCodeLifecycle(root: string): Promise<void> {
  const hooks = createOpenCodePlugin({ directory: root });
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
  expect(await toolLines(root)).toHaveLength(3);
}

describe('OpenCode plugin lifecycle (RF1, RF3, DEC-13)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t07-open-life-'));
    await writeRuntimeConfig(root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('counts one turn per completed call and resets on session.compacted and session.created', async () => { await checkOpenCodeLifecycle(root); });
});

