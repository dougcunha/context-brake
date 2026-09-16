import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { createBenchmarkContext, sampleInProcess } from '../../src/infrastructure/diagnostics/in-process-sampler.js';

const FIXTURES = join(process.cwd(), 'tests', 'fixtures', 'benchmark');

type ToolCounters = { toolCalls: number; beforeAgentStart: number; badContext: number };
type OpenCounters = { before: number; badArgs: number };

async function loadCounters<T>(name: string): Promise<T> {
  return (await import(pathToFileURL(join(FIXTURES, name)).href)) as T;
}

async function runToolHandler(): Promise<void> {
  const mod = await loadCounters<{ counters: ToolCounters }>('in-process-handlers.mjs');
  const samples = await sampleInProcess({ assetPath: join(FIXTURES, 'in-process-handlers.mjs'), event: 'tool_call', payload: { toolName: 'read', input: { path: 'a' } } });
  expect(samples).toHaveLength(100);
  expect(mod.counters.toolCalls).toBe(110);
  expect(mod.counters.beforeAgentStart).toBe(0);
  expect(mod.counters.badContext).toBe(0);
}

async function runMissingHandler(): Promise<void> {
  const samples = await sampleInProcess({ assetPath: join(FIXTURES, 'in-process-missing.mjs'), event: 'tool_call', payload: {} });
  expect(samples).toBeNull();
}

async function runOpenCodeHandler(): Promise<void> {
  const mod = await loadCounters<{ counters: OpenCounters }>('in-process-opencode.mjs');
  const payload = { input: { tool: 'bash', sessionID: 's', callID: 'c' }, output: { args: { command: 'ls' } } };
  const samples = await sampleInProcess({ assetPath: join(FIXTURES, 'in-process-opencode.mjs'), event: 'tool.execute.before', payload });
  expect(samples).toHaveLength(100);
  expect(mod.counters.before).toBe(110);
  expect(mod.counters.badArgs).toBe(0);
}

describe('TC-04: in-process sampling selects the registered handler by event (FR-05)', () => {
  beforeEach(async () => {
    const tool = await loadCounters<{ counters: ToolCounters }>('in-process-handlers.mjs');
    Object.assign(tool.counters, { toolCalls: 0, beforeAgentStart: 0, badContext: 0 });
    const open = await loadCounters<{ counters: OpenCounters }>('in-process-opencode.mjs');
    Object.assign(open.counters, { before: 0, badArgs: 0 });
  });

  it('runs only the tool_call handler across ten warm-ups and one hundred samples', runToolHandler);
  it('returns null instead of falling back when the named handler is absent', runMissingHandler);
  it('invokes OpenCode tool.execute.before with the documented input and output arguments', runOpenCodeHandler);
  it('builds the documented synchronous ContextUsage shape and session manager', () => {
    const context = createBenchmarkContext();
    expect(context.getContextUsage()).toEqual({ tokens: 42000, contextWindow: 128000, percent: 33 });
    expect(context.sessionManager.getSessionId()).toBe('context-brake-benchmark');
    expect(typeof context.cwd).toBe('string');
    expect(context.ui.notify).toBeTypeOf('function');
  });
});
