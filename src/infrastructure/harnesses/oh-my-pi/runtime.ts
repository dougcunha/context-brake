import type { RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { createRuntimeResolver, measuredUsageFrom, runInProcessEvent, type InProcessRuntimeResolver, type MeasuredUsageInput } from '../common/in-process-support.js';
import { requireIdentifier, textValue } from '../common/runtime-support.js';
import { OMP_CAPABILITIES } from './capabilities.js';
import { mapOmpEvent, mapOmpInput, renderOmpToolCall, renderOmpToolResult } from './events.js';

export { mapOmpEvent, mapOmpInput, renderOmpToolCall, renderOmpToolResult } from './events.js';

const HARNESS = 'oh-my-pi';
const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };

export const ompDescriptor: RuntimeDescriptor = { harness: HARNESS, capabilities: OMP_CAPABILITIES, estimation: ESTIMATION, newSessionCommand: '/new' };

export type OmpContext = {
  readonly cwd?: string | undefined;
  readonly sessionManager?: { readonly getSessionId?: () => string } | undefined;
  readonly getContextUsage?: (() => unknown) | undefined;
  readonly ui?: { readonly notify?: (message: string, level?: string) => void } | undefined;
};
export type OmpApi = { on?: (event: string, handler: (payload: unknown, context: OmpContext) => Promise<unknown>) => void };

function rootOf(context: OmpContext): string | null {
  return textValue(context.cwd);
}

function sessionOf(context: OmpContext): SessionKey {
  return { harness: HARNESS, sessionId: requireIdentifier(context.sessionManager?.getSessionId?.()), agentId: null };
}

function measuredOf(context: OmpContext): MeasuredUsageInput | undefined {
  return measuredUsageFrom(context.getContextUsage?.());
}

function eventOf(eventName: string, payload: unknown, context: OmpContext): RuntimeEvent | null {
  try {
    return mapOmpEvent(eventName, payload, sessionOf(context));
  } catch {
    return null;
  }
}

async function handleToolCall(payload: unknown, context: OmpContext, resolver: InProcessRuntimeResolver): Promise<unknown> {
  const event = eventOf('tool_call', payload, context);
  if (event === null) return undefined;
  const decision = await runInProcessEvent({ resolver, projectRoot: rootOf(context), event, engineInput: { measured: measuredOf(context) } });
  return renderOmpToolCall(decision);
}

async function handleToolResult(payload: unknown, context: OmpContext, resolver: InProcessRuntimeResolver): Promise<unknown> {
  const event = eventOf('tool_result', payload, context);
  if (event === null) return undefined;
  const engineInput: RuntimeInput = { measured: measuredOf(context), ...mapOmpInput('tool_result', payload) };
  const decision = await runInProcessEvent({ resolver, projectRoot: rootOf(context), event, engineInput });
  return decision.kind === 'context' ? renderOmpToolResult(payload, decision.block) : undefined;
}

async function recordBoot(event: RuntimeEvent | null, context: OmpContext, state: { resolver: InProcessRuntimeResolver; pendingBoots: Map<string, string> }): Promise<void> {
  if (event === null) return;
  const decision = await runInProcessEvent({ resolver: state.resolver, projectRoot: rootOf(context), event });
  if (decision.kind === 'context') state.pendingBoots.set(event.session.sessionId, decision.block);
}

async function handleBeforeAgentStart(context: OmpContext, pendingBoots: Map<string, string>): Promise<unknown> {
  const sessionId = context.sessionManager?.getSessionId?.();
  if (!sessionId) return undefined;
  const message = pendingBoots.get(sessionId);
  if (!message) return undefined;
  pendingBoots.delete(sessionId);
  return { message };
}

async function handleSessionStop(payload: unknown, context: OmpContext, resolver: InProcessRuntimeResolver): Promise<void> {
  const event = eventOf('session_stop', payload, context);
  if (event === null) return;
  const decision = await runInProcessEvent({ resolver, projectRoot: rootOf(context), event });
  if (decision.kind === 'notify_user') context.ui?.notify?.(decision.text, 'info');
}

export function createOmpExtension(api: OmpApi): void {
  const resolver = createRuntimeResolver(ompDescriptor);
  const pendingBoots = new Map<string, string>();
  api.on?.('tool_call', (payload, context) => handleToolCall(payload, context, resolver));
  api.on?.('tool_result', (payload, context) => handleToolResult(payload, context, resolver));
  api.on?.('session_start', (payload, context) => recordBoot(eventOf('session_start', payload, context), context, { resolver, pendingBoots }));
  api.on?.('session_compact', (payload, context) => recordBoot(eventOf('session_compact', payload, context), context, { resolver, pendingBoots }));
  api.on?.('auto_compaction_end', (payload, context) => recordBoot(eventOf('auto_compaction_end', payload, context), context, { resolver, pendingBoots }));
  api.on?.('before_agent_start', (_payload, context) => handleBeforeAgentStart(context, pendingBoots));
  api.on?.('session_stop', (payload, context) => handleSessionStop(payload, context, resolver));
}
