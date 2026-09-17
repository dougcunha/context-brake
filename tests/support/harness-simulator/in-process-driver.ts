import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { HookOutcome, SessionChannel } from './session-recorder.js';
import type { SessionStep } from './agent-profiles.js';
import { assistantText, baselinePrompt, corpusText, measureTokens, type OutputKind, type SimulatedCall, type SimulatedWindow } from './scenarios.js';

export const IN_PROCESS_HARNESSES = ['pi', 'oh-my-pi'] as const;
export type InProcessHarnessId = (typeof IN_PROCESS_HARNESSES)[number];
const ASSET_PATHS: Record<InProcessHarnessId, string> = { pi: 'dist/assets/runtime/pi-extension.js', 'oh-my-pi': 'dist/assets/runtime/omp-extension.js' };
type Handler = (payload: unknown, context: unknown) => Promise<unknown>;
type Handlers = Map<string, Handler>;

async function loadHandlers(harness: InProcessHarnessId): Promise<Handlers> {
  const module = (await import(pathToFileURL(resolve(ASSET_PATHS[harness])).href)) as { default?: (api: unknown) => unknown };
  const handlers: Handlers = new Map();
  module.default?.({ on: (event: string, handler: Handler) => { handlers.set(event, handler); } });
  return handlers;
}
async function callHandler(input: { readonly handlers: Handlers; readonly event: string; readonly payload: unknown; readonly context: unknown }): Promise<unknown> {
  const handler = input.handlers.get(input.event);
  return handler === undefined ? undefined : handler(input.payload, input.context);
}
function toolNameOf(call: SimulatedCall): string {
  if (call.tool === 'shell') return 'bash';
  return call.tool === 'write' ? 'write' : 'read';
}
function toolInputOf(call: SimulatedCall): Record<string, unknown> {
  return call.tool === 'shell' ? { command: call.command } : { path: call.path };
}
function blockPayload(decision: unknown): string | null {
  const content = (decision as { content?: unknown } | undefined)?.content;
  if (!Array.isArray(content)) return null;
  const texts = content.flatMap((part) => (typeof (part as { text?: unknown }).text === 'string' ? [(part as { text: string }).text] : []));
  return texts.find((text) => text.startsWith('[ContextBrake v1]')) ?? null;
}
function isBlocked(decision: unknown): boolean {
  return (decision as { block?: unknown } | undefined)?.block === true;
}
export type InProcessSessionInput = {
  readonly root: string;
  readonly harness: InProcessHarnessId;
  readonly sessionId: string;
  readonly window: SimulatedWindow;
  readonly kind: OutputKind;
  readonly seedCharacters: number;
};
export type InProcessSession = SessionChannel & { readonly harness: InProcessHarnessId; readonly sessionId: string; readonly contextTokens: () => number };
type State = { readonly handlers: Handlers; readonly lines: string[]; context: unknown; tokenTotal: number };
function addLine(state: State, text: string): void {
  state.lines.push(text);
  state.tokenTotal += measureTokens(text) + 1;
}
async function runToolCall(state: State, step: SessionStep): Promise<HookOutcome> {
  addLine(state, assistantText());
  addLine(state, JSON.stringify(toolInputOf(step.call)));
  const payload = { toolName: toolNameOf(step.call), toolCallId: step.call.id, input: toolInputOf(step.call) };
  const decision = await callHandler({ handlers: state.handlers, event: 'tool_call', payload, context: state.context });
  return { allowed: !isBlocked(decision), response: JSON.stringify(decision ?? null) };
}
async function runToolResult(state: State, step: SessionStep, output: string): Promise<string | null> {
  addLine(state, output);
  const payload = { toolName: toolNameOf(step.call), toolCallId: step.call.id, input: toolInputOf(step.call), content: [{ type: 'text', text: output }] };
  const decision = await callHandler({ handlers: state.handlers, event: 'tool_result', payload, context: state.context });
  return blockPayload(decision);
}
function apiContextFor(input: InProcessSessionInput, state: State): unknown {
  return { cwd: input.root, sessionManager: { getSessionId: () => input.sessionId }, getContextUsage: () => ({ tokens: state.tokenTotal, contextWindow: input.window, percent: Math.floor((state.tokenTotal * 100) / input.window) }), ui: { notify: () => undefined } };
}
async function createState(input: InProcessSessionInput, lines: string[], tokenTotal: number): Promise<State> {
  const state: State = { handlers: await loadHandlers(input.harness), lines, context: undefined, tokenTotal };
  state.context = apiContextFor(input, state);
  return state;
}
export async function createInProcessSession(input: InProcessSessionInput): Promise<InProcessSession> {
  const lines: string[] = [];
  const seeded: State = { handlers: new Map(), lines, context: undefined, tokenTotal: 0 };
  addLine(seeded, baselinePrompt());
  addLine(seeded, corpusText({ kind: input.kind, characters: input.seedCharacters }, 0));
  let state = await createState(input, lines, seeded.tokenTotal);
  return {
    harness: input.harness,
    sessionId: input.sessionId,
    contextTokens: () => state.tokenTotal,
    pre: (step) => runToolCall(state, step),
    post: (step, output) => runToolResult(state, step, output),
    reset: () => callHandler({ handlers: state.handlers, event: 'session_compact', payload: { reason: 'compact' }, context: state.context }).then(() => undefined),
    reload: async () => { state = await createState(input, state.lines, state.tokenTotal); },
  };
}
