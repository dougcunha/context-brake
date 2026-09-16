import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent, SessionKey, ToolCall } from '../../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { asRecord, assetProjectRoot, characterLength, parsePayload, requireIdentifier, textValue } from '../common/runtime-support.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../runtime/process-hook-host.js';
import { ANTIGRAVITY_CAPABILITIES } from './capabilities.js';
import { antigravityPayloadSchema, type AntigravityPayload } from './schemas.js';

const HARNESS = 'antigravity-cli';
const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };

export const antigravityDescriptor: RuntimeDescriptor = { harness: HARNESS, capabilities: ANTIGRAVITY_CAPABILITIES, estimation: ESTIMATION, newSessionCommand: null };

function sessionOf(payload: AntigravityPayload): SessionKey {
  return { harness: HARNESS, sessionId: requireIdentifier(payload.conversationId), agentId: null };
}

function toolOf(payload: AntigravityPayload): ToolCall {
  const name = payload.toolCall?.name ?? 'unknown';
  const args = asRecord(payload.toolCall?.args);
  if (name === 'run_command') return { name, category: 'shell', paths: [], command: textValue(args?.['CommandLine']) };
  return { name, category: 'other', paths: [], command: null };
}

export function mapAntigravityEvent(eventName: string, payload: unknown): RuntimeEvent | null {
  const data = parsePayload(antigravityPayloadSchema, payload);
  const session = sessionOf(data);
  switch (eventName) {
    case 'PreToolUse': return { kind: 'pre_tool', session, tool: toolOf(data) };
    case 'PostToolUse': return { kind: 'post_tool', session, tool: toolOf(data), toolUseId: null };
    case 'PreInvocation': return { kind: 'pre_invocation', session };
    default: return null;
  }
}

export function mapAntigravityInput(eventName: string, payload: unknown): RuntimeInput {
  if (eventName !== 'PostToolUse') return {};
  const data = parsePayload(antigravityPayloadSchema, payload);
  return { observedCharacters: characterLength(data.toolCall?.args) };
}

export function renderAntigravityDecision(decision: RuntimeDecision, eventName: string): string | null {
  if (eventName === 'PreToolUse') {
    if (decision.kind === 'deny') return JSON.stringify({ decision: 'deny', reason: decision.message });
    return JSON.stringify({ decision: 'allow' });
  }
  if (eventName === 'PostToolUse') return JSON.stringify({});
  if (eventName === 'PreInvocation') {
    const injectSteps = decision.kind === 'context' ? [{ ephemeralMessage: decision.block }] : [];
    return JSON.stringify({ injectSteps });
  }
  return null;
}

export const antigravityAdapter: ProcessHarnessAdapter = {
  descriptor: antigravityDescriptor,
  mapEvent: mapAntigravityEvent,
  mapInput: mapAntigravityInput,
  renderDecision: renderAntigravityDecision,
  resolveProjectRoot: async () => await assetProjectRoot(),
};

export function runAntigravityHook(): Promise<number> {
  return runProcessHook(antigravityAdapter);
}
