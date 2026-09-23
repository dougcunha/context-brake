import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey, ToolCall } from '../../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { asRecord, assetProjectRoot, characterLength, parsePayload, projectRootFromEnvironment, requireIdentifier, textValue } from '../common/runtime-support.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../runtime/process-hook-host.js';
import { CLAUDE_CAPABILITIES } from './capabilities.js';
import { claudePayloadSchema, type ClaudePayload } from './schemas.js';

const HARNESS = 'claude-code';
const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };
const WRITE_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];

export const claudeDescriptor: RuntimeDescriptor = { harness: HARNESS, capabilities: CLAUDE_CAPABILITIES, estimation: ESTIMATION, newSessionCommand: '/clear' };

function sessionOf(payload: ClaudePayload): SessionKey {
  return { harness: HARNESS, sessionId: requireIdentifier(payload.session_id), agentId: payload.agent_id ?? null };
}

function toolOf(payload: ClaudePayload): ToolCall {
  const name = payload.tool_name ?? 'unknown';
  const input = asRecord(payload.tool_input);
  if (name === 'Bash') return { name, category: 'shell', paths: [], command: textValue(input?.['command']) };
  const path = textValue(input?.['file_path']);
  if (path === null) return { name, category: 'other', paths: [], command: null };
  if (name === 'Read') return { name, category: 'file_read', paths: [path], command: null };
  if (WRITE_TOOLS.includes(name)) return { name, category: 'file_write', paths: [path], command: null };
  return { name, category: 'other', paths: [], command: null };
}

function resetEvent(session: SessionKey, source: string | null): RuntimeEvent | null {
  if (source === 'clear' || source === 'compact') return { kind: 'session_reset', session, reason: source };
  if (source === 'startup' || source === 'fork') return { kind: 'session_reset', session, reason: 'new' };
  return null;
}

export function mapClaudeEvent(eventName: string, payload: unknown): RuntimeEvent | null {
  const data = parsePayload(claudePayloadSchema, payload);
  const session = sessionOf(data);
  switch (eventName) {
    case 'PreToolUse': return { kind: 'pre_tool', session, tool: toolOf(data) };
    case 'PostToolUse': return { kind: 'post_tool', session, tool: toolOf(data), toolUseId: data.tool_use_id ?? null };
    case 'SessionStart': return resetEvent(session, data.source ?? null);
    case 'Stop': return { kind: 'response_end', session, text: data.last_assistant_message ?? '' };
    default: return null;
  }
}

export function mapClaudeInput(eventName: string, payload: unknown): RuntimeInput {
  if (eventName !== 'PostToolUse') return {};
  const data = parsePayload(claudePayloadSchema, payload);
  return { observedCharacters: characterLength(data.tool_input) + characterLength(data.tool_response) };
}

export function renderClaudeDecision(decision: RuntimeDecision, eventName: string): string | null {
  if (decision.kind === 'deny') return JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, permissionDecision: 'deny', permissionDecisionReason: decision.message } });
  if (decision.kind === 'context' && (eventName === 'PostToolUse' || eventName === 'SessionStart')) return JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: decision.block } });
  if (decision.kind === 'notify_user') return JSON.stringify({ systemMessage: decision.text });
  return null;
}

export const claudeAdapter: ProcessHarnessAdapter = {
  descriptor: claudeDescriptor,
  mapEvent: mapClaudeEvent,
  mapInput: mapClaudeInput,
  renderDecision: renderClaudeDecision,
  resolveProjectRoot: async () => projectRootFromEnvironment(['CLAUDE_PROJECT_DIR']) ?? await assetProjectRoot(),
};

export function runClaudeCodeHook(): Promise<number> {
  return runProcessHook(claudeAdapter);
}
