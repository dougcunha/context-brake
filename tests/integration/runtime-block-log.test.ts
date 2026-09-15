import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { Clock } from '../../src/core/contracts/session-ledger.js';
import { NodeBlockLog, NodeRuntimeErrorLog } from '../../src/infrastructure/runtime/node-runtime-logs.js';
import { runtimeDirectory } from '../../src/infrastructure/runtime/runtime-paths.js';
import { listRuntimeStateFiles } from '../../src/infrastructure/storage/runtime-state-files.js';

const SENTINEL = 'SENTINEL-SECRET-424242';
const NOW = '2026-09-15T12:00:00.000Z';
const clock: Clock = { now: () => new Date(NOW) };
const KEY: SessionKey = { harness: 'claude-code', sessionId: 'session-1', agentId: null };

async function readLines(filePath: string): Promise<Record<string, unknown>[]> {
  const content = await readFile(filePath, 'utf8');
  expect(content.endsWith('\n')).toBe(true);
  expect(content.includes('\r')).toBe(false);
  return content.trimEnd().split('\n').map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('T03 block and error logs (RF20, CA-18, DEC-11, TC-20)', () => {
  let tempDir: string;
  let blocks: NodeBlockLog;
  let errors: NodeRuntimeErrorLog;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-logs-'));
    blocks = new NodeBlockLog(tempDir, clock);
    errors = new NodeRuntimeErrorLog(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('records the documented block metadata and nothing else', async () => {
    await blocks.append(KEY, { tool: 'Read', zone: 'CRITICAL', turn: 12, percentage: 75, source: 'estimated', reason: 'critical_ceiling' });
    const [line] = await readLines(join(runtimeDirectory(tempDir), 'blocks.jsonl'));
    expect(Object.keys(line ?? {}).sort()).toEqual(['agentId', 'at', 'harness', 'percentage', 'reason', 'sessionId', 'source', 'tool', 'turn', 'v', 'zone']);
    expect(line).toMatchObject({ v: 1, at: NOW, harness: 'claude-code', sessionId: 'session-1', agentId: null, tool: 'Read', zone: 'CRITICAL', turn: 12, percentage: 75, source: 'estimated', reason: 'critical_ceiling' });
  });

  it('records the documented error metadata with a named code and no payload values', async () => {
    await errors.append('claude-code', { event: 'PreToolUse', code: 'INVALID_CONFIG', detail: 'InvalidConfigurationError telemetry.turnCeiling' });
    const [line] = await readLines(join(runtimeDirectory(tempDir), 'errors.jsonl'));
    expect(Object.keys(line ?? {}).sort()).toEqual(['at', 'code', 'detail', 'event', 'harness', 'v']);
    expect(line).toMatchObject({ v: 1, at: NOW, harness: 'claude-code', event: 'PreToolUse', code: 'INVALID_CONFIG' });
  });
});

describe('T03 logs never store tool content (RF20, CA-18, privacy constraint)', () => {
  let tempDir: string;
  let blocks: NodeBlockLog;
  let errors: NodeRuntimeErrorLog;
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t03-secret-'));
    blocks = new NodeBlockLog(tempDir, clock);
    errors = new NodeRuntimeErrorLog(tempDir, clock);
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('never stores tool input, output, paths, or commands', async () => {
    const containedPayload = { tool_input: { file_path: `/repo/${SENTINEL}.ts`, content: SENTINEL }, tool_response: { text: SENTINEL } };
    expect(JSON.stringify(containedPayload)).toContain(SENTINEL);
    await blocks.append(KEY, { tool: 'Read', zone: 'CRITICAL', turn: 12, percentage: null, source: null, reason: 'integration_failure' });
    await errors.append('claude-code', { event: 'PreToolUse', code: 'PAYLOAD_INVALID', detail: 'PayloadSchemaError' });
    const files = await listRuntimeStateFiles(tempDir);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = await readFile(resolve(tempDir, file), 'utf8');
      expect(content, file).not.toContain(SENTINEL);
    }
  });
});
