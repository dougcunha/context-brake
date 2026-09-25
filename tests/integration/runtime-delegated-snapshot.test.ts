import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RuntimeDecision } from '../../src/core/contracts/runtime.js';
import { claudeDescriptor, mapClaudeEvent } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { composeRuntime, loadRuntimeConfiguration } from '../../src/infrastructure/runtime/runtime-composition.js';
import { normalizeEventToolPaths } from '../../src/infrastructure/runtime/tool-path-normalizer.js';
import { delegatedConfig } from '../helpers/delegated-fixtures.js';
import { fixedClock, seedTurns } from '../helpers/runtime-seed.js';

const SKILL_FIXTURE = resolve('tests/fixtures/harnesses/claude-code/pre-tool-use-skill.json');
const SESSION = 'session-claude-1';
let projectRoot: string;
beforeEach(async () => {
  projectRoot = await realpath(await mkdtemp(join(tmpdir(), 'cb-delegated-')));
  await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify(delegatedConfig()), 'utf8');
});
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function dispatch(eventName: string, payload: unknown): Promise<RuntimeDecision> {
  const config = await loadRuntimeConfiguration(projectRoot);
  const services = composeRuntime({ projectRoot, config, descriptor: claudeDescriptor, clock: fixedClock });
  const event = await normalizeEventToolPaths(mapClaudeEvent(eventName, payload), projectRoot);
  if (event === null) throw new Error(`unmapped ${eventName}`);
  return services.engine.handle(event, {});
}
function postTool(turn: number): unknown {
  return { session_id: SESSION, hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: 'a.ts' }, tool_response: {}, tool_use_id: `toolu_post_${turn}` };
}
function preTool(toolName: string, toolInput: Record<string, unknown>): unknown {
  return { session_id: SESSION, hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: toolInput, tool_use_id: 'toolu_pre' };
}
const KEY = { harness: 'claude-code', sessionId: SESSION, agentId: null } as const;

describe('delegated mode through the Claude Code runtime (TC-09, FR-06, DEC-07)', () => {
  beforeEach(async () => { await seedTurns(projectRoot, KEY, 12); });
  it('allows the configured Skill call from the documented payload at the ceiling', async () => {
    const payload = JSON.parse(await readFile(SKILL_FIXTURE, 'utf8')) as unknown;
    expect(await dispatch('PreToolUse', payload)).toEqual({ kind: 'neutral' });
  });
  it('denies another skill with the delegated message', async () => {
    const decision = await dispatch('PreToolUse', preTool('Skill', { skill: 'deploy' }));
    expect(decision.kind === 'deny' ? decision.message : '').toContain('Run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET].');
  });
  it('allows an absolute native snapshot path after normalization', async () => {
    await mkdir(join(projectRoot, 'tasks', 'prd-x'), { recursive: true });
    const decision = await dispatch('PreToolUse', preTool('Write', { file_path: join(projectRoot, 'tasks', 'prd-x', 'context-snapshot.md'), content: '' }));
    expect(decision).toEqual({ kind: 'neutral' });
  });
  it('denies a write outside the allowed patterns', async () => {
    expect((await dispatch('PreToolUse', preTool('Write', { file_path: join(projectRoot, 'src', 'a.ts'), content: '' }))).kind).toBe('deny');
  });
});

describe('mode follows the plan file between events (TC-10, FR-01)', () => {
  beforeEach(async () => { await seedTurns(projectRoot, KEY, 10); });
  it('switches from the delegated action to the plan action once the plan exists', async () => {
    const delegated = await dispatch('PostToolUse', postTool(11));
    expect(delegated).toEqual({ kind: 'context', block: expect.stringContaining('action=run "/sdd-snapshot"') });
    await writeFile(join(projectRoot, 'task_plan.json'), '{}', 'utf8');
    const plan = await dispatch('PostToolUse', postTool(12));
    expect(plan).toEqual({ kind: 'context', block: expect.stringContaining('action=other tools are blocked') });
  });
});
