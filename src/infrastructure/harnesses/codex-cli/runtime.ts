import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey, ToolCall } from '../../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { asRecord, assetProjectRoot, characterLength, parsePayload, requireIdentifier, textValue } from '../common/runtime-support.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../runtime/process-hook-host.js';
import { CODEX_CAPABILITIES } from './capabilities.js';
import { codexPayloadSchema, type CodexPayload } from './schemas.js';

const HARNESS = 'codex-cli';
const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };
const PATCH_PATH_PREFIXES = ['*** Add File: ', '*** Update File: ', '*** Delete File: ', '*** Move to: '];

export const codexDescriptor: RuntimeDescriptor = { harness: HARNESS, capabilities: CODEX_CAPABILITIES, estimation: ESTIMATION, newSessionCommand: '/new' };

function sessionOf(payload: CodexPayload): SessionKey {
  return { harness: HARNESS, sessionId: requireIdentifier(payload.session_id), agentId: payload.agent_id ?? null };
}

function patchPaths(input: Record<string, unknown> | null): string[] {
  const command = textValue(input?.['command']);
  if (command === null) return [];
  return command.split('\n').flatMap((line) => {
    const prefix = PATCH_PATH_PREFIXES.find((candidate) => line.startsWith(candidate));
    return prefix ? [line.slice(prefix.length).trim()] : [];
  });
}

function toolOf(payload: CodexPayload): ToolCall {
  const name = payload.tool_name ?? 'unknown';
  const input = asRecord(payload.tool_input);
  if (name === 'Bash') return { name, category: 'shell', paths: [], command: textValue(input?.['command']) };
  if (name === 'apply_patch') {
    const paths = patchPaths(input);
    return { name, category: paths.length > 0 ? 'file_write' : 'other', paths, command: null };
  }
  return { name, category: 'other', paths: [], command: null };
}

function resetEvent(session: SessionKey, source: string | null): RuntimeEvent | null {
  if (source === 'clear' || source === 'compact') return { kind: 'session_reset', session, reason: source };
  if (source === 'startup') return { kind: 'session_reset', session, reason: 'new' };
  return null;
}

export function mapCodexEvent(eventName: string, payload: unknown): RuntimeEvent | null {
  const data = parsePayload(codexPayloadSchema, payload);
  const session = sessionOf(data);
  switch (eventName) {
    case 'PreToolUse': return { kind: 'pre_tool', session, tool: toolOf(data) };
    case 'PostToolUse': return { kind: 'post_tool', session, tool: toolOf(data), toolUseId: data.tool_use_id ?? null };
    case 'SessionStart': return resetEvent(session, data.source ?? null);
    case 'Stop': return { kind: 'response_end', session, text: data.last_assistant_message ?? '' };
    default: return null;
  }
}

export function mapCodexInput(eventName: string, payload: unknown): RuntimeInput {
  if (eventName !== 'PostToolUse') return {};
  const data = parsePayload(codexPayloadSchema, payload);
  return { observedCharacters: characterLength(data.tool_input) + characterLength(data.tool_response) };
}

export function renderCodexDecision(decision: RuntimeDecision, eventName: string): string | null {
  if (decision.kind === 'deny') return JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, permissionDecision: 'deny', permissionDecisionReason: decision.message } });
  if (decision.kind === 'context' && (eventName === 'PostToolUse' || eventName === 'SessionStart')) return JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: decision.block } });
  if (decision.kind === 'notify_user') return JSON.stringify({ systemMessage: decision.text });
  return null;
}

export const codexAdapter: ProcessHarnessAdapter = {
  descriptor: codexDescriptor,
  mapEvent: mapCodexEvent,
  mapInput: mapCodexInput,
  renderDecision: renderCodexDecision,
  resolveProjectRoot: async () => await assetProjectRoot(),
};

export function runCodexCliHook(): Promise<number> {
  return runProcessHook(codexAdapter);
}
