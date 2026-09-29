import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import type { RuntimeDecision } from '../../src/core/contracts/runtime.js';
import { claudeDescriptor, mapClaudeEvent } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { composeRuntime, loadRuntimeConfiguration } from '../../src/infrastructure/runtime/runtime-composition.js';
import { normalizeEventToolPaths } from '../../src/infrastructure/runtime/tool-path-normalizer.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { fixedClock, seedCriticalSession } from '../helpers/runtime-seed.js';

type Handler = (input: unknown, output?: unknown) => Promise<unknown>;
const OPENCODE_ASSET = resolve('dist/assets/runtime/opencode-plugin.js');
const SESSION_START_FIXTURE = resolve('tests/fixtures/harnesses/claude-code/session-start.json');
const SESSION = 'session-claude-1';
const KEY = { harness: 'claude-code', sessionId: SESSION, agentId: null } as const;
const LIGHT_CONFIG = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, contextWindowCeiling: 24000 }, lightMode: { triggerZone: 'RED' } };
let projectRoot: string;
beforeEach(async () => {
  projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'cb-light-')));
  await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify(LIGHT_CONFIG), 'utf8');
  await writeFile(join(projectRoot, 'task_plan.json'), '{"not":"a plan"}', 'utf8');
});
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function dispatch(eventName: string, payload: unknown): Promise<RuntimeDecision> {
  const config = await loadRuntimeConfiguration(projectRoot);
  const services = composeRuntime({ projectRoot, config, descriptor: claudeDescriptor, clock: fixedClock });
  const event = await normalizeEventToolPaths(mapClaudeEvent(eventName, payload), projectRoot);
  if (event === null) throw new Error(`unmapped ${eventName}`);
  return services.engine.handle(event, {});
}

describe('light mode through the Claude Code runtime (TC-10, FR-03, FR-05, FR-06, FR-07)', () => {
  beforeEach(async () => { await seedCriticalSession(projectRoot, KEY); });
  it('injects nothing at session start even with a plan file present', async () => {
    const payload = JSON.parse(await readFile(SESSION_START_FIXTURE, 'utf8')) as unknown;
    expect(await dispatch('SessionStart', payload)).toEqual({ kind: 'neutral' });
  });
  it('injects the light action after a tool call', async () => {
    const payload = { session_id: SESSION, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: 'a.ts' }, tool_response: {}, tool_use_id: 'toolu_light' };
    const decision = await dispatch('PostToolUse', payload);
    expect(decision).toEqual({ kind: 'context', block: expect.stringMatching(/^\[ContextBrake v3\] .* zone=CRITICAL action=save your snapshot or checkpoint immediately, then end reply with \[REQUEST_SESSION_RESET\]$/) });
  });
  it('allows a write to any path above the critical ceiling', async () => {
    const payload = { session_id: SESSION, hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: join(projectRoot, 'src', 'a.ts'), content: '' }, tool_use_id: 'toolu_pre' };
    expect(await dispatch('PreToolUse', payload)).toEqual({ kind: 'neutral' });
  });
});

describe('light mode in the built OpenCode plugin (TC-10, FR-06)', () => {
  it('lets a tool run above the critical ceiling', async () => {
    const module = (await import(pathToFileURL(OPENCODE_ASSET).href)) as { default: (context?: unknown) => Record<string, Handler> };
    const hooks = module.default({ directory: projectRoot });
    const before = await loadHarnessPayload('opencode', 'tool-execute-before.json') as { input: Record<string, unknown>; output: unknown };
    await seedCriticalSession(projectRoot, { harness: 'opencode', sessionId: 'opencode-critical', agentId: null });
    await expect(hooks['tool.execute.before']!({ ...before.input, sessionID: 'opencode-critical' }, before.output)).resolves.toBeUndefined();
  });
});
