import { createPiRestartExtension, type PiRestartApi, type PiRestartContext } from '../../src/infrastructure/harnesses/pi/restart.js';
import { loadHarnessPayload } from './harness-payloads.js';
import { readRestartLog, type RestartRun } from './in-process-restart-run.js';

type Handler = (payload: Record<string, unknown>, context: PiRestartContext) => Promise<unknown>;
export type PiWorld = { readonly root: string; readonly handlers: Map<string, Handler>; readonly seeds: string[]; cancel: boolean; mode: string };

const SESSION_ID = 'pi-session-1';

function contextOf(world: PiWorld): PiRestartContext {
  return {
    cwd: world.root, mode: world.mode, hasUI: true,
    sessionManager: { getSessionId: () => SESSION_ID },
    ui: { notify: () => undefined },
    newSession: async (options) => {
      if (world.cancel) return { cancelled: true };
      await options.withSession({ sendUserMessage: async (text) => { world.seeds.push(text); } });
      return { cancelled: false };
    },
  };
}

export function createPiWorld(root: string): PiWorld {
  const world: PiWorld = { root, handlers: new Map(), seeds: [], cancel: false, mode: 'tui' };
  const api: PiRestartApi = {
    on: (event, handler) => { world.handlers.set(event, handler); },
    registerCommand: (name, command) => { world.handlers.set(`/${name}`, (_payload, context) => command.handler('', context)); },
    sendUserMessage: (text) => world.handlers.get(text)!({}, contextOf(world)).then(() => undefined),
  };
  createPiRestartExtension(api);
  return world;
}

async function fire(world: PiWorld, event: string, payload: unknown = {}): Promise<void> {
  await world.handlers.get(event)!(payload as Record<string, unknown>, contextOf(world));
  for (let tick = 0; tick < 5; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

async function signalTurn(world: PiWorld, tools: number): Promise<void> {
  await fire(world, 'agent_start');
  for (let call = 0; call < tools; call += 1) await fire(world, 'tool_result');
  await fire(world, 'agent_end', await loadHarnessPayload('pi', 'agent-end-reset.json'));
}

export function piRun(world: PiWorld): RestartRun {
  return {
    start: () => fire(world, 'session_start'),
    signal: (tools = 1) => signalTurn(world, tools),
    ownPrompt: async () => fire(world, 'input', await loadHarnessPayload('pi', 'input-extension.json')),
    type: async () => fire(world, 'input', await loadHarnessPayload('pi', 'input-interactive.json')),
    setMode: (mode) => { world.mode = mode; },
    sessions: () => world.seeds.length,
    seeds: () => world.seeds,
    log: () => readRestartLog(world.root, 'pi', SESSION_ID),
  };
}

export function openPiRun(root: string): RestartRun {
  return piRun(createPiWorld(root));
}
