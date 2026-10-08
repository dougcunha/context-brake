import type { OpenSessionRequest, RestartHost } from '../../../core/contracts/restart-host.js';
import { foldToolCalls, resetConsecutive } from '../../../core/services/restart-guards.js';
import { handleTurnEnd } from '../../../core/services/restart-flow.js';
import { systemClock } from '../../runtime/runtime-composition.js';
import { NodeHandoffStore } from '../../storage/node-handoff-store.js';
import { recordInProcessDecision } from '../common/in-process-restart-log.js';
import { recordRestartLoaded, reportFailures } from '../common/in-process-restart-support.js';
import { countToolCall, inProcessStandDown, memoryGuardStore, readRestartSettings, RESTART_COMMAND, startTurn, takeToolCalls, turnStartedAt } from '../common/in-process-restart-state.js';
import { textValue } from '../common/runtime-support.js';
import { lastAssistantText } from './events.js';

type Payload = Record<string, unknown>;
type ReplacedSession = { sendUserMessage(text: string): Promise<void> };
export type PiRestartContext = {
  readonly cwd?: string | undefined;
  readonly mode?: string | undefined;
  readonly hasUI?: boolean | undefined;
  readonly sessionManager?: { readonly getSessionId?: () => string } | undefined;
  readonly ui?: { readonly notify?: (message: string, level?: string) => void } | undefined;
  readonly newSession?: (options: { withSession(next: ReplacedSession): Promise<void> }) => Promise<{ cancelled: boolean }>;
};
type Handler = (payload: Payload, context: PiRestartContext) => Promise<unknown>;
export type PiRestartApi = {
  on(event: string, handler: Handler): void;
  registerCommand(name: string, command: { description: string; handler(args: string, context: PiRestartContext): Promise<void> }): void;
  sendUserMessage(text: string, options?: { expandPromptTemplates?: boolean }): Promise<void> | void;
};

const HARNESS = 'pi';
const INTERACTIVE_MODE = 'tui';
const INTERACTIVE_SOURCE = 'interactive';
const pending = new Map<string, OpenSessionRequest>();

function hostFor(api: PiRestartApi, context: PiRestartContext, root: string): RestartHost {
  const target = { root, harness: HARNESS, sessionId: context.sessionManager?.getSessionId?.() ?? 'unknown' } as const;
  return {
    guards: memoryGuardStore(root),
    handoff: new NodeHandoffStore(root, systemClock),
    standDown: async () => inProcessStandDown(context.mode === INTERACTIVE_MODE && context.hasUI === true),
    turnStartedAt: () => turnStartedAt(root),
    resumeForSeed: async () => null,
    openSession: (request) => {
      pending.set(root, request);
      Promise.resolve(api.sendUserMessage(`/${RESTART_COMMAND}`, { expandPromptTemplates: true })).catch(() => request.onRejected());
    },
    log: (code) => recordInProcessDecision(target, code, systemClock.now()),
    notify: (text) => context.ui?.notify?.(text, 'info'),
  };
}

async function onAgentEnd(api: PiRestartApi, payload: Payload, context: PiRestartContext): Promise<void> {
  const root = textValue(context.cwd);
  if (root === null) return;
  await foldToolCalls(memoryGuardStore(root), takeToolCalls(root));
  const text = lastAssistantText(payload['messages']);
  const settings = await readRestartSettings(root);
  if (settings === undefined) return;
  await handleTurnEnd(hostFor(api, context, root), { text, settings });
}

async function runRestartCommand(context: PiRestartContext): Promise<void> {
  const root = textValue(context.cwd);
  const request = root === null ? undefined : pending.get(root);
  if (root === null || request === undefined || context.newSession === undefined) return;
  pending.delete(root);
  try {
    const result = await context.newSession({ withSession: async (next) => { await request.onOpened(); await next.sendUserMessage(request.seed); } });
    if (result.cancelled) await request.onRejected();
  } catch {
    await request.onRejected();
  }
}

export function createPiRestartExtension(api: PiRestartApi): void {
  api.on('agent_start', async (_payload, context) => { const root = textValue(context.cwd); if (root !== null) startTurn(root, systemClock.now().getTime()); });
  api.on('tool_result', async (_payload, context) => { const root = textValue(context.cwd); if (root !== null) countToolCall(root); });
  api.on('input', (payload, context) => reportFailures(context, async () => {
    const root = textValue(context.cwd);
    if (root !== null && payload['source'] === INTERACTIVE_SOURCE) await resetConsecutive(memoryGuardStore(root));
  }));
  api.on('session_start', (_payload, context) => reportFailures(context, () => recordRestartLoaded(context, HARNESS)));
  api.on('agent_end', (payload, context) => reportFailures(context, () => onAgentEnd(api, payload, context)));
  api.registerCommand(RESTART_COMMAND, { description: 'ContextBrake: open a new session and resume from the recorded state', handler: (_args, context) => reportFailures(context, () => runRestartCommand(context)) });
}
