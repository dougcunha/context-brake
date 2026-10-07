import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDecision } from '../../src/core/contracts/runtime.js';
import { claudeDescriptor, mapClaudeEvent } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { composeRuntime, loadRuntimeConfiguration } from '../../src/infrastructure/runtime/runtime-composition.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { fixedClock, seedCriticalSession } from '../helpers/runtime-seed.js';

type Handler = (input: unknown, output?: unknown) => Promise<unknown>;
const OPENCODE_ASSET = resolve('dist/assets/runtime/opencode-plugin.js');
const SESSION_START_FIXTURE = resolve('tests/fixtures/harnesses/claude-code/session-start.json');
const SESSION = 'session-claude-1';
const KEY = { harness: 'claude-code', sessionId: SESSION, agentId: null } as const;
const BASE_CONFIG = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, contextWindowCeiling: 24000 } };
const RESUME = { ...BASE_CONFIG, snapshot: { triggerZone: 'RED', command: '/sdd-snapshot', resumeCommand: '/sdd-resume' } };
const CLEAR_PAYLOAD = { session_id: SESSION, hook_event_name: 'SessionStart', source: 'clear' };
let projectRoot: string;
beforeEach(async () => {
  projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'cb-light-')));
  await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify(BASE_CONFIG), 'utf8');
});
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function dispatch(eventName: string, payload: unknown): Promise<RuntimeDecision> {
  const config = await loadRuntimeConfiguration(projectRoot);
  const services = composeRuntime({ projectRoot, config, descriptor: claudeDescriptor, clock: fixedClock });
  const event = mapClaudeEvent(eventName, payload);
  if (event === null) throw new Error(`unmapped ${eventName}`);
  return services.engine.handle(event, {});
}

describe('no snapshot command through the Claude Code runtime (prd-12 TC-08, FR-06, FR-07)', () => {
  beforeEach(async () => { await seedCriticalSession(projectRoot, KEY); });
  it('injects nothing at session start', async () => {
    const payload = JSON.parse(await readFile(SESSION_START_FIXTURE, 'utf8')) as unknown;
    expect(await dispatch('SessionStart', payload)).toEqual({ kind: 'neutral' });
  });
  it('injects the generic action without the marker after a tool call', async () => {
    const payload = { session_id: SESSION, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: 'a.ts' }, tool_response: {}, tool_use_id: 'toolu_light' };
    const decision = await dispatch('PostToolUse', payload);
    expect(decision).toEqual({ kind: 'context', block: expect.stringMatching(/^\[ContextBrake v3\] .* zone=CRITICAL action=stop starting new work; tell the user what remains$/) });
  });
  it('returns no resume block on a clear session start', async () => {
    expect(await dispatch('SessionStart', CLEAR_PAYLOAD)).toEqual({ kind: 'neutral' });
  });
});

describe('with a resume command (prd-12 FR-05, TC-07)', () => {
  it('injects the resume text on a clear session start', async () => {
    await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify(RESUME), 'utf8');
    expect(await dispatch('SessionStart', CLEAR_PAYLOAD)).toEqual({ kind: 'context', block: '[ContextBrake resume v1] Run "/sdd-resume" before continuing.' });
  });
});

describe('the built OpenCode plugin above the critical ceiling (FR-07, TC-09)', () => {
  it('registers no pre-tool hook and records a post-tool call above the critical ceiling', async () => {
    const module = (await import(pathToFileURL(OPENCODE_ASSET).href)) as { default: (context?: unknown) => Record<string, Handler> };
    const hooks = module.default({ directory: projectRoot });
    const after = await loadHarnessPayload('opencode', 'tool-execute-after.json') as { input: Record<string, unknown>; output: unknown };
    await seedCriticalSession(projectRoot, { harness: 'opencode', sessionId: 'opencode-critical', agentId: null });
    expect('tool.execute.before' in hooks).toBe(false);
    await expect(hooks['tool.execute.after']!({ ...after.input, sessionID: 'opencode-critical' }, after.output)).resolves.toBeUndefined();
  });
});
