import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey, ToolCall } from '../../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { asRecord, assetProjectRoot, characterLength, parsePayload, projectRootFromEnvironment, requireIdentifier, textValue } from '../common/runtime-support.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../runtime/process-hook-host.js';
import { CURSOR_CAPABILITIES } from './capabilities.js';
import { cursorPayloadSchema, type CursorPayload } from './schemas.js';

const HARNESS = 'cursor';
const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };

export const cursorDescriptor: RuntimeDescriptor = { harness: HARNESS, capabilities: CURSOR_CAPABILITIES, estimation: ESTIMATION, newSessionCommand: null };

function sessionOf(payload: CursorPayload): SessionKey {
  return { harness: HARNESS, sessionId: requireIdentifier(payload.conversation_id), agentId: null };
}

function toolOf(payload: CursorPayload): ToolCall {
  const name = payload.tool_name ?? 'unknown';
  const input = asRecord(payload.tool_input);
  if (name === 'Shell') return { name, category: 'shell', paths: [], command: textValue(input?.['command']) };
  return { name, category: 'other', paths: [], command: null };
}

export function mapCursorEvent(eventName: string, payload: unknown): RuntimeEvent | null {
  const data = parsePayload(cursorPayloadSchema, payload);
  const session = sessionOf(data);
  switch (eventName) {
    case 'preToolUse': return { kind: 'pre_tool', session, tool: toolOf(data) };
    case 'postToolUse': return { kind: 'post_tool', session, tool: toolOf(data), toolUseId: data.tool_use_id ?? null };
    case 'sessionStart': return { kind: 'session_reset', session, reason: 'new' };
    case 'preCompact': return { kind: 'session_reset', session, reason: 'compact' };
    default: return null;
  }
}

export function mapCursorInput(eventName: string, payload: unknown): RuntimeInput {
  if (eventName !== 'postToolUse') return {};
  const data = parsePayload(cursorPayloadSchema, payload);
  return { observedCharacters: characterLength(data.tool_input) + characterLength(data.tool_output) };
}

export function renderCursorDecision(decision: RuntimeDecision, eventName: string): string | null {
  if (decision.kind === 'deny') return JSON.stringify({ permission: 'deny', agent_message: decision.message, user_message: `ContextBrake blocked ${decision.tool}: the session is above the critical ceiling.` });
  if (eventName === 'preToolUse') return decision.kind === 'neutral' ? JSON.stringify({ permission: 'allow' }) : null;
  if (decision.kind === 'context' && eventName === 'postToolUse') return JSON.stringify({ additional_context: decision.block });
  return null;
}

export const cursorAdapter: ProcessHarnessAdapter = {
  descriptor: cursorDescriptor,
  mapEvent: mapCursorEvent,
  mapInput: mapCursorInput,
  renderDecision: renderCursorDecision,
  resolveProjectRoot: async () => projectRootFromEnvironment(['CURSOR_PROJECT_DIR', 'CLAUDE_PROJECT_DIR']) ?? await assetProjectRoot(),
};

export function runCursorHook(): Promise<number> {
  return runProcessHook(cursorAdapter);
}
