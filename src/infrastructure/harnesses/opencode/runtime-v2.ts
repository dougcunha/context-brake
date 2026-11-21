import type { RuntimeEvent, SessionKey } from '../../../core/contracts/runtime.js';
import { createRuntimeResolver, runInProcessEvent, type InProcessRuntimeResolver } from '../common/in-process-support.js';
import { parsePayload, textValue } from '../common/runtime-support.js';
import {
  mapOpenCodeV2SessionEvent,
  mapOpenCodeV2ToolResult,
  openCodeV2ObservedCharacters,
  type OpenCodeSessionEvent,
} from './events.js';
import { openCodeDescriptor } from './runtime.js';
import { opencodeV2ToolAfterEventSchema } from './schemas.js';

const HARNESS = 'opencode';
const FALLBACK_SESSION_ID = 'project';
const V2_SESSION_EVENTS = ['session.created', 'session.compaction.ended'] as const;

export type OpenCodeV2Location = {
  readonly directory?: string;
  readonly project?: { readonly directory?: string; readonly canonical?: string };
};

export type OpenCodeV2PluginContext = {
  readonly location?: OpenCodeV2Location;
  readonly tool?: {
    readonly hook?: (name: string, callback: (event: unknown) => Promise<void> | void) => Promise<unknown> | unknown;
  };
  readonly event?: {
    readonly subscribe?: (options?: { readonly types?: readonly string[]; readonly signal?: AbortSignal }) => AsyncIterable<unknown>;
  };
};

function resolveV2ProjectRoot(ctx?: OpenCodeV2PluginContext): string {
  return (
    textValue(ctx?.location?.directory) ??
    textValue(ctx?.location?.project?.directory) ??
    textValue(ctx?.location?.project?.canonical) ??
    process.cwd()
  );
}

function v2SessionKeyOf(payload: unknown, fallbackSessionId: string | null): SessionKey {
  const data = parsePayload(opencodeV2ToolAfterEventSchema, payload);
  const sessionId = textValue(data.sessionID) ?? textValue(data.sessionId) ?? fallbackSessionId ?? FALLBACK_SESSION_ID;
  return { harness: HARNESS, sessionId, agentId: null };
}

async function handleV2After(payload: unknown, projectRoot: string, resolver: InProcessRuntimeResolver): Promise<void> {
  let event: RuntimeEvent;
  try {
    event = mapOpenCodeV2ToolResult(payload, v2SessionKeyOf(payload, null));
  } catch {
    return;
  }
  const engineInput = { observedCharacters: openCodeV2ObservedCharacters(payload) };
  await runInProcessEvent({ resolver, projectRoot, event, engineInput });
}

async function handleV2Event(payload: unknown, projectRoot: string, resolver: InProcessRuntimeResolver): Promise<void> {
  let mapped: OpenCodeSessionEvent | null;
  try {
    mapped = mapOpenCodeV2SessionEvent(payload);
  } catch {
    return;
  }
  if (mapped === null) return;
  const reason = mapped.type === 'session.created' ? 'new' : 'compact';
  const event: RuntimeEvent = { kind: 'session_reset', session: v2SessionKeyOf({}, mapped.sessionId), reason };
  await runInProcessEvent({ resolver, projectRoot, event });
}

function startEventLoop(ctx: OpenCodeV2PluginContext, projectRoot: string, resolver: InProcessRuntimeResolver): () => void {
  const subscribe = ctx.event?.subscribe;
  if (typeof subscribe !== 'function') return () => {};
  const controller = new AbortController();
  void (async () => {
    try {
      for await (const item of subscribe({ types: V2_SESSION_EVENTS, signal: controller.signal })) {
        await handleV2Event(item, projectRoot, resolver);
      }
    } catch {
      // Ignore abort and stream shutdown errors on plugin unload.
    }
  })();
  return () => controller.abort();
}

export async function setupOpenCodeV2Plugin(ctx?: OpenCodeV2PluginContext): Promise<() => void> {
  const resolver = createRuntimeResolver(openCodeDescriptor);
  const projectRoot = resolveV2ProjectRoot(ctx);
  if (typeof ctx?.tool?.hook === 'function') {
    await ctx.tool.hook('execute.after', (event) => handleV2After(event, projectRoot, resolver));
  }
  return startEventLoop(ctx ?? {}, projectRoot, resolver);
}
