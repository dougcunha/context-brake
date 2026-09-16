import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey, ToolCall } from '../../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { asRecord, assetProjectRoot, characterLength, parsePayload, requireIdentifier, textValue } from '../common/runtime-support.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../runtime/process-hook-host.js';
import { COPILOT_CAPABILITIES } from './capabilities.js';
import { copilotPayloadSchema, type CopilotPayload } from './schemas.js';

const HARNESS = 'github-copilot-cli';
const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };
const READ_TOOLS = ['view'];
const WRITE_TOOLS = ['edit', 'create'];
const SHELL_TOOLS = ['bash', 'powershell'];

export const copilotDescriptor: RuntimeDescriptor = { harness: HARNESS, capabilities: COPILOT_CAPABILITIES, estimation: ESTIMATION, newSessionCommand: null };

function sessionOf(payload: CopilotPayload): SessionKey {
  return { harness: HARNESS, sessionId: requireIdentifier(payload.sessionId), agentId: null };
}

function resultCharacters(payload: CopilotPayload): number {
  const result = asRecord(payload.toolResult);
  return characterLength(result?.['textResultForLlm'] ?? payload.toolResult);
}

function toolOf(payload: CopilotPayload): ToolCall {
  const name = payload.toolName ?? 'unknown';
  const input = asRecord(payload.toolArgs);
  if (SHELL_TOOLS.includes(name)) return { name, category: 'shell', paths: [], command: textValue(input?.['command']) };
  const path = textValue(input?.['path']);
  if (path === null) return { name, category: 'other', paths: [], command: null };
  if (WRITE_TOOLS.includes(name)) return { name, category: 'file_write', paths: [path], command: null };
  if (READ_TOOLS.includes(name)) return { name, category: 'file_read', paths: [path], command: null };
  return { name, category: 'other', paths: [], command: null };
}

function resetEvent(session: SessionKey, source: string | null): RuntimeEvent | null {
  if (source === 'startup' || source === 'new') return { kind: 'session_reset', session, reason: 'new' };
  return null;
}

export function mapCopilotEvent(eventName: string, payload: unknown): RuntimeEvent | null {
  const data = parsePayload(copilotPayloadSchema, payload);
  const session = sessionOf(data);
  switch (eventName) {
    case 'preToolUse': return { kind: 'pre_tool', session, tool: toolOf(data) };
    case 'postToolUse': return { kind: 'post_tool', session, tool: toolOf(data), toolUseId: null };
    case 'sessionStart': return resetEvent(session, data.source ?? null);
    case 'preCompact': return { kind: 'session_reset', session, reason: 'compact' };
    default: return null;
  }
}

export function mapCopilotInput(eventName: string, payload: unknown): RuntimeInput {
  if (eventName !== 'postToolUse') return {};
  const data = parsePayload(copilotPayloadSchema, payload);
  return { observedCharacters: characterLength(data.toolArgs) + resultCharacters(data) };
}

export function renderCopilotDecision(decision: RuntimeDecision): string | null {
  if (decision.kind === 'deny') return JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: decision.message });
  if (decision.kind === 'context') return JSON.stringify({ additionalContext: decision.block });
  return null;
}

export const copilotAdapter: ProcessHarnessAdapter = {
  descriptor: copilotDescriptor,
  mapEvent: mapCopilotEvent,
  mapInput: mapCopilotInput,
  renderDecision: renderCopilotDecision,
  resolveProjectRoot: async () => await assetProjectRoot(),
};

export function runCopilotHook(): Promise<number> {
  return runProcessHook(copilotAdapter);
}
