import { createOmpRestartExtension, type OmpRestartApi, type OmpRestartContext } from '../../src/infrastructure/harnesses/oh-my-pi/restart.js';
import { loadHarnessPayload } from './harness-payloads.js';
import { readRestartLog, type RestartRun } from './in-process-restart-run.js';

type Handler = (payload: Record<string, unknown>, context: OmpRestartContext) => Promise<unknown>;
export type OmpWorld = { readonly root: string; readonly handlers: Map<string, Handler>; readonly sent: string[]; editor: string; sessions: number; mode: string };

const SESSION_ID = 'omp-session-1';
const COMMAND = '/context-brake-restart';
const TYPED_PROMPT = { type: 'input', text: 'carry on with the plan', source: 'interactive' };

function contextOf(world: OmpWorld): OmpRestartContext {
  return {
    cwd: world.root, mode: world.mode, hasUI: true,
    sessionManager: { getSessionId: () => SESSION_ID },
    ui: { notify: () => undefined, getEditorText: () => world.editor, setEditorText: (text) => { world.editor = text; } },
    newSession: async () => { world.sessions += 1; return { cancelled: false }; },
  };
}

export function createOmpWorld(root: string): OmpWorld {
  const world: OmpWorld = { root, handlers: new Map(), sent: [], editor: '', sessions: 0, mode: 'tui' };
  const api: OmpRestartApi = {
    on: (event, handler) => { world.handlers.set(event, handler); },
    registerCommand: (name, command) => { world.handlers.set(`/${name}`, (_payload, context) => command.handler('', context)); },
    sendUserMessage: (text) => { world.sent.push(text); },
  };
  createOmpRestartExtension(api);
  return world;
}

async function fire(world: OmpWorld, event: string, payload: unknown = {}): Promise<void> {
  await world.handlers.get(event)!(payload as Record<string, unknown>, contextOf(world));
}

async function pressEnter(world: OmpWorld): Promise<void> {
  await fire(world, 'input', await loadHarnessPayload('oh-my-pi', 'input-interactive.json'));
  world.editor = '';
  await fire(world, COMMAND);
}

async function signalTurn(world: OmpWorld, tools: number): Promise<void> {
  await fire(world, 'agent_start');
  for (let call = 0; call < tools; call += 1) await fire(world, 'tool_result');
  await fire(world, 'session_stop', await loadHarnessPayload('oh-my-pi', 'session-stop-reset.json'));
  if (world.editor === COMMAND) await pressEnter(world);
}

export function ompRun(world: OmpWorld): RestartRun {
  return {
    start: () => fire(world, 'session_start'),
    signal: (tools = 1) => signalTurn(world, tools),
    ownPrompt: async () => undefined,
    type: () => fire(world, 'input', TYPED_PROMPT),
    setMode: (mode) => { world.mode = mode; },
    sessions: () => world.sessions,
    seeds: () => world.sent,
    log: () => readRestartLog(world.root, 'oh-my-pi', SESSION_ID),
  };
}

export function openOmpRun(root: string): RestartRun {
  return ompRun(createOmpWorld(root));
}
