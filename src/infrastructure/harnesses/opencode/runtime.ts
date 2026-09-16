import type { RuntimeDescriptor, RuntimeEvent, SessionKey } from '../../../core/contracts/runtime.js';
import { createRuntimeResolver, runInProcessEvent, type InProcessRuntimeResolver } from '../common/in-process-support.js';
import { asRecord, parsePayload, textValue } from '../common/runtime-support.js';
import { OPENCODE_CAPABILITIES } from './capabilities.js';
import { mapOpenCodeSessionEvent, mapOpenCodeToolCall, mapOpenCodeToolResult, openCodeObservedCharacters, type OpenCodeSessionEvent } from './events.js';
import { opencodeToolExecuteInputSchema } from './schemas.js';

export { mapOpenCodeSessionEvent, mapOpenCodeToolCall, mapOpenCodeToolResult, openCodeObservedCharacters } from './events.js';

const HARNESS = 'opencode';
const ESTIMATION = { baselineTokens: 15000, tokensPerTurn: 150 };
const FALLBACK_SESSION_ID = 'project';

export const openCodeDescriptor: RuntimeDescriptor = { harness: HARNESS, capabilities: OPENCODE_CAPABILITIES, estimation: ESTIMATION, newSessionCommand: null };

export class OpenCodeBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenCodeBlockedError';
  }
}

export type OpenCodePluginHooks = {
  readonly 'tool.execute.before'?: (input: unknown, output: unknown) => Promise<void>;
  readonly 'tool.execute.after'?: (input: unknown, output: unknown) => Promise<void>;
  readonly event?: (payload: unknown) => Promise<void>;
};

export type OpenCodeHandlerInput = { readonly input: unknown; readonly output: unknown; readonly projectRoot: string; readonly resolver: InProcessRuntimeResolver };
export type OpenCodeEventHandlerInput = { readonly payload: unknown; readonly projectRoot: string; readonly resolver: InProcessRuntimeResolver };

function resolveProjectRoot(context: unknown): string {
  const record = asRecord(context);
  return textValue(record?.['directory']) ?? textValue(record?.['worktree']) ?? process.cwd();
}

function sessionKeyOf(input: unknown, fallbackSessionId: string | null): SessionKey {
  const data = parsePayload(opencodeToolExecuteInputSchema, input);
  return { harness: HARNESS, sessionId: textValue(data.sessionID) ?? textValue(data.sessionId) ?? fallbackSessionId ?? FALLBACK_SESSION_ID, agentId: null };
}

async function handleBefore(args: OpenCodeHandlerInput): Promise<void> {
  let event: RuntimeEvent;
  try {
    event = mapOpenCodeToolCall(args.input, args.output, sessionKeyOf(args.input, null));
  } catch {
    return;
  }
  const decision = await runInProcessEvent({ resolver: args.resolver, projectRoot: args.projectRoot, event });
  if (decision.kind === 'deny') throw new OpenCodeBlockedError(decision.message);
}

async function handleAfter(args: OpenCodeHandlerInput): Promise<void> {
  let event: RuntimeEvent;
  try {
    event = mapOpenCodeToolResult(args.input, args.output, sessionKeyOf(args.input, null));
  } catch {
    return;
  }
  const engineInput = { observedCharacters: openCodeObservedCharacters(args.output) };
  await runInProcessEvent({ resolver: args.resolver, projectRoot: args.projectRoot, event, engineInput });
}

async function handleEvent(args: OpenCodeEventHandlerInput): Promise<void> {
  let mapped: OpenCodeSessionEvent | null;
  try {
    mapped = mapOpenCodeSessionEvent(args.payload);
  } catch {
    return;
  }
  if (mapped === null) return;
  const reason = mapped.type === 'session.created' ? 'new' : 'compact';
  const event: RuntimeEvent = { kind: 'session_reset', session: sessionKeyOf({}, mapped.sessionId), reason };
  await runInProcessEvent({ resolver: args.resolver, projectRoot: args.projectRoot, event });
}

export function createOpenCodePlugin(context?: unknown): OpenCodePluginHooks {
  const resolver = createRuntimeResolver(openCodeDescriptor);
  const projectRoot = resolveProjectRoot(context);
  return {
    'tool.execute.before': (input, output) => handleBefore({ input, output, projectRoot, resolver }),
    'tool.execute.after': (input, output) => handleAfter({ input, output, projectRoot, resolver }),
    event: (payload) => handleEvent({ payload, projectRoot, resolver }),
  };
}
