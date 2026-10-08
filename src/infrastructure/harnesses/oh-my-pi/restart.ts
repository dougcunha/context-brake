import type { OpenSessionRequest, RestartHost } from '../../../core/contracts/restart-host.js';
import { foldToolCalls, resetConsecutive } from '../../../core/services/restart-guards.js';
import { handleTurnEnd } from '../../../core/services/restart-flow.js';
import { systemClock } from '../../runtime/runtime-composition.js';
import { NodeHandoffStore } from '../../storage/node-handoff-store.js';
import { recordInProcessDecision } from '../common/in-process-restart-log.js';
import { recordRestartLoaded, reportFailures } from '../common/in-process-restart-support.js';
import { countToolCall, inProcessStandDown, memoryGuardStore, readRestartSettings, RESTART_COMMAND, startTurn, takeToolCalls, turnStartedAt } from '../common/in-process-restart-state.js';
import { textValue } from '../common/runtime-support.js';
import { stopMessageText } from './events.js';

type Payload = Record<string, unknown>;
export type OmpRestartContext = {
  readonly cwd?: string | undefined;
  readonly mode?: string | undefined;
  readonly hasUI?: boolean | undefined;
  readonly sessionManager?: { readonly getSessionId?: () => string } | undefined;
  readonly ui?: { readonly notify?: (message: string, level?: string) => void; readonly getEditorText?: () => string; readonly setEditorText?: (text: string) => void } | undefined;
  readonly newSession?: () => Promise<{ cancelled: boolean }>;
};
type Handler = (payload: Payload, context: OmpRestartContext) => Promise<unknown>;
export type OmpRestartApi = {
  on(event: string, handler: Handler): void;
  registerCommand(name: string, command: { description: string; handler(args: string, context: OmpRestartContext): Promise<void> }): void;
  sendUserMessage(text: string): void;
};

const HARNESS = 'oh-my-pi';
const INTERACTIVE_MODE = 'tui';
const INTERACTIVE_SOURCE = 'interactive';
const COMMAND_TEXT = `/${RESTART_COMMAND}`;
const pending = new Map<string, OpenSessionRequest>();

function prefill(context: OmpRestartContext, root: string, request: OpenSessionRequest): void {
  const editor = context.ui;
  if (editor?.setEditorText === undefined || (editor.getEditorText?.() ?? '').trim() !== '') {
    void request.onRejected();
    return;
  }
  pending.set(root, request);
  editor.setEditorText(COMMAND_TEXT);
}

function hostFor(context: OmpRestartContext, root: string): RestartHost {
  const target = { root, harness: HARNESS, sessionId: context.sessionManager?.getSessionId?.() ?? 'unknown' } as const;
  return {
    guards: memoryGuardStore(root),
    handoff: new NodeHandoffStore(root, systemClock),
    standDown: async () => inProcessStandDown(context.mode === INTERACTIVE_MODE && context.hasUI === true),
    turnStartedAt: () => turnStartedAt(root),
    resumeForSeed: async () => null,
    openSession: (request) => prefill(context, root, request),
    log: (code) => recordInProcessDecision(target, code, systemClock.now()),
    notify: (text) => context.ui?.notify?.(text, 'info'),
  };
}

async function onSessionStop(payload: Payload, context: OmpRestartContext): Promise<void> {
  const root = textValue(context.cwd);
  if (root === null) return;
  await foldToolCalls(memoryGuardStore(root), takeToolCalls(root));
  const settings = await readRestartSettings(root);
  if (settings === undefined) return;
  await handleTurnEnd(hostFor(context, root), { text: stopMessageText(payload['last_assistant_message']), settings });
}

async function runRestartCommand(api: OmpRestartApi, context: OmpRestartContext): Promise<void> {
  const root = textValue(context.cwd);
  const request = root === null ? undefined : pending.get(root);
  if (root === null || request === undefined || context.newSession === undefined) return;
  pending.delete(root);
  try {
    if ((await context.newSession()).cancelled) return request.onRejected();
    await request.onOpened();
    api.sendUserMessage(request.seed);
  } catch {
    await request.onRejected();
  }
}

async function onInput(payload: Payload, context: OmpRestartContext): Promise<void> {
  const root = textValue(context.cwd);
  const typed = payload['source'] === INTERACTIVE_SOURCE && textValue(payload['text'])?.trim() !== COMMAND_TEXT;
  if (root !== null && typed) await resetConsecutive(memoryGuardStore(root));
}

export function createOmpRestartExtension(api: OmpRestartApi): void {
  api.on('agent_start', async (_payload, context) => { const root = textValue(context.cwd); if (root !== null) startTurn(root, systemClock.now().getTime()); });
  api.on('tool_result', async (_payload, context) => { const root = textValue(context.cwd); if (root !== null) countToolCall(root); });
  api.on('input', (payload, context) => reportFailures(context, () => onInput(payload, context)));
  api.on('session_start', (_payload, context) => reportFailures(context, () => recordRestartLoaded(context, HARNESS)));
  api.on('session_switch', (_payload, context) => reportFailures(context, () => recordRestartLoaded(context, HARNESS)));
  api.on('session_stop', (payload, context) => reportFailures(context, () => onSessionStop(payload, context)));
  api.registerCommand(RESTART_COMMAND, { description: 'ContextBrake: open a new session and resume from the recorded state', handler: (_args, context) => reportFailures(context, () => runRestartCommand(api, context)) });
}
