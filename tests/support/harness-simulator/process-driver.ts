import { strict as assert } from 'node:assert';
import { runBuiltCli } from '../../e2e/cli-runner.js';
import { installedHookPath, runInstalledHook } from '../../helpers/built-hook.js';
import type { SessionChannel } from './session-recorder.js';
import type { SessionStep } from './agent-profiles.js';
import type { SimulatedCall } from './scenarios.js';

export const PROCESS_HARNESSES = ['claude-code', 'codex-cli', 'cursor', 'github-copilot-cli'] as const;
export type ProcessHarnessId = (typeof PROCESS_HARNESSES)[number];

type Surface = { readonly read: string; readonly write: string; readonly shell: string; readonly path: string; readonly pre: string; readonly post: string };
const SURFACES: Record<ProcessHarnessId, Surface> = {
  'claude-code': { read: 'Read', write: 'Write', shell: 'Bash', path: 'file_path', pre: 'PreToolUse', post: 'PostToolUse' },
  'codex-cli': { read: 'Read', write: 'apply_patch', shell: 'Bash', path: 'file_path', pre: 'PreToolUse', post: 'PostToolUse' },
  cursor: { read: 'Read', write: 'Write', shell: 'Shell', path: 'path', pre: 'preToolUse', post: 'postToolUse' },
  'github-copilot-cli': { read: 'view', write: 'edit', shell: 'bash', path: 'path', pre: 'preToolUse', post: 'postToolUse' },
};
export function toolNameOf(harness: ProcessHarnessId, call: SimulatedCall): string {
  return call.tool === 'shell' ? SURFACES[harness].shell : (call.tool === 'write' ? SURFACES[harness].write : SURFACES[harness].read);
}
export function toolInputOf(harness: ProcessHarnessId, call: SimulatedCall): Record<string, unknown> {
  return call.tool === 'shell' ? { command: call.command } : { [SURFACES[harness].path]: call.path, ...(call.tool === 'write' ? { content: call.content } : {}) };
}
type PayloadInput = { readonly sessionId: string; readonly call: SimulatedCall; readonly agentId: string | null; readonly output: string | null };
type PayloadBuilder = (input: PayloadInput, event: string) => Record<string, unknown>;
function claudeLike(harness: 'claude-code' | 'codex-cli', input: PayloadInput, event: string): Record<string, unknown> {
  const base = { session_id: input.sessionId, tool_name: toolNameOf(harness, input.call), tool_input: toolInputOf(harness, input.call), tool_use_id: input.call.id };
  const withAgent = input.agentId === null ? base : { ...base, agent_id: input.agentId };
  return event === 'PostToolUse' ? { ...withAgent, tool_response: input.output ?? '' } : withAgent;
}
function cursorPayload(input: PayloadInput, event: string): Record<string, unknown> {
  const base = { conversation_id: input.sessionId, hook_event_name: event, tool_name: toolNameOf('cursor', input.call), tool_input: toolInputOf('cursor', input.call), tool_use_id: input.call.id };
  return event === 'postToolUse' ? { ...base, tool_output: input.output ?? '' } : base;
}
function copilotPayload(input: PayloadInput, event: string): Record<string, unknown> {
  const base = { sessionId: input.sessionId, hookName: event, toolName: toolNameOf('github-copilot-cli', input.call), toolArgs: toolInputOf('github-copilot-cli', input.call) };
  return event === 'postToolUse' ? { ...base, toolResult: { resultType: 'success', textResultForLlm: input.output ?? '' } } : base;
}
const PAYLOAD_BUILDERS: Record<ProcessHarnessId, PayloadBuilder> = {
  'claude-code': (i, e) => claudeLike('claude-code', i, e),
  'codex-cli': (i, e) => claudeLike('codex-cli', i, e),
  cursor: cursorPayload,
  'github-copilot-cli': copilotPayload,
};
function isDenied(harness: ProcessHarnessId, response: string): boolean {
  if (response === '') return false;
  const value = JSON.parse(response) as Record<string, unknown>;
  if (harness === 'cursor') return value['permission'] === 'deny';
  if (harness === 'github-copilot-cli') return value['permissionDecision'] === 'deny';
  return (value['hookSpecificOutput'] as Record<string, unknown> | undefined)?.['permissionDecision'] === 'deny';
}
function contextBlock(harness: ProcessHarnessId, response: string): string | null {
  if (response === '') return null;
  const value = JSON.parse(response) as Record<string, unknown>;
  const specific = value['hookSpecificOutput'] as Record<string, unknown> | undefined;
  const block = specific?.['additionalContext'] ?? value['additional_context'] ?? value['additionalContext'];
  return typeof block === 'string' ? block : null;
}
function eventRequest(harness: ProcessHarnessId, sessionId: string, kind: 'reset' | 'startup' | 'compact'): { event: string; payload: Record<string, unknown> } {
  if (kind === 'reset') {
    if (harness === 'cursor') return { event: 'preCompact', payload: { conversation_id: sessionId, hook_event_name: 'preCompact', trigger: 'auto' } };
    if (harness === 'github-copilot-cli') return { event: 'preCompact', payload: { sessionId, hookName: 'preCompact' } };
    return { event: 'SessionStart', payload: { session_id: sessionId, source: 'compact' } };
  }
  if (harness === 'cursor') return { event: 'sessionStart', payload: { conversation_id: sessionId, session_id: sessionId, hook_event_name: 'sessionStart' } };
  if (harness === 'github-copilot-cli') return { event: 'sessionStart', payload: { sessionId, source: kind } };
  return { event: 'SessionStart', payload: { session_id: sessionId, hook_event_name: 'SessionStart', source: kind } };
}
export async function installHarness(root: string, harness: ProcessHarnessId): Promise<void> {
  const result = await runBuiltCli(['init', '--yes', '--harness', harness], root);
  if (result.code !== 0) throw new Error(`context-brake init failed for ${harness}: ${result.stderr}`);
}
export type ProcessSession = SessionChannel & { readonly harness: ProcessHarnessId; readonly sessionId: string };
export function createProcessSession(input: { readonly root: string; readonly harness: ProcessHarnessId; readonly sessionId: string }): ProcessSession {
  const hook = installedHookPath(input.harness, input.root);
  const ids = SURFACES[input.harness];
  function build(step: SessionStep, output: string | null, event: string): Record<string, unknown> {
    const payload: PayloadInput = { sessionId: input.sessionId, call: step.call, agentId: step.agentId ?? null, output };
    return PAYLOAD_BUILDERS[input.harness](payload, event);
  }
  return {
    harness: input.harness, sessionId: input.sessionId,
    pre: async (step) => {
      const result = await runInstalledHook(hook, ids.pre, build(step, null, ids.pre));
      return { allowed: !isDenied(input.harness, result.stdout), response: result.stdout };
    },
    post: async (step, output) => contextBlock(input.harness, (await runInstalledHook(hook, ids.post, build(step, output, ids.post))).stdout),
    reset: async () => {
      const req = eventRequest(input.harness, input.sessionId, 'reset');
      await runInstalledHook(hook, req.event, req.payload);
    },
    boot: async (source = 'startup') => {
      if (source === 'compact' && (input.harness === 'cursor' || input.harness === 'github-copilot-cli')) return null;
      const req = eventRequest(input.harness, input.sessionId, source);
      const result = await runInstalledHook(hook, req.event, req.payload);
      assert.notEqual(result.stdout, '', `Boot hook exited ${result.code}; ${result.stderr.match(/ContextBrake: [A-Z_]+/)?.[0] ?? 'no error code'}`);
      return contextBlock(input.harness, result.stdout);
    },
  };
}
