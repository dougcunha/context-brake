import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { createPiRestartExtension, type PiRestartApi, type PiRestartContext } from '../../src/infrastructure/harnesses/pi/restart.js';
import { loadHarnessPayload } from './harness-payloads.js';

type Handler = (payload: Record<string, unknown>, context: PiRestartContext) => Promise<unknown>;
export type World = { readonly root: string; readonly handlers: Map<string, Handler>; readonly seeds: string[]; readonly notices: string[]; cancel: boolean; mode: string };

const SESSION_ID = 'pi-session-1';

export async function writeConfig(root: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const config = { ...DEFAULT_CONFIG, snapshot: { ...DEFAULT_CONFIG.snapshot, command: '/sdd-snapshot' }, autoRestart: { maxConsecutiveRestarts: 2 }, ...overrides };
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
}

function contextOf(world: World): PiRestartContext {
  return {
    cwd: world.root, mode: world.mode, hasUI: true,
    sessionManager: { getSessionId: () => SESSION_ID },
    ui: { notify: (text) => { world.notices.push(text); } },
    newSession: async (options) => {
      if (world.cancel) return { cancelled: true };
      await options.withSession({ sendUserMessage: async (text) => { world.seeds.push(text); } });
      return { cancelled: false };
    },
  };
}

export function createWorld(root: string): World {
  const world: World = { root, handlers: new Map(), seeds: [], notices: [], cancel: false, mode: 'tui' };
  const api: PiRestartApi = {
    on: (event, handler) => { world.handlers.set(event, handler); },
    registerCommand: (name, command) => { world.handlers.set(`/${name}`, (_payload, context) => command.handler('', context)); },
    sendUserMessage: (text) => world.handlers.get(text)!({}, contextOf(world)).then(() => undefined),
  };
  createPiRestartExtension(api);
  return world;
}

export async function fire(world: World, event: string, payload: unknown = {}): Promise<void> {
  await world.handlers.get(event)!(payload as Record<string, unknown>, contextOf(world));
  for (let tick = 0; tick < 5; tick += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function signalTurn(world: World, tools = 1): Promise<void> {
  await fire(world, 'agent_start');
  for (let call = 0; call < tools; call += 1) await fire(world, 'tool_result');
  await fire(world, 'agent_end', await loadHarnessPayload('pi', 'agent-end-reset.json'));
}

export async function codes(world: World): Promise<string[]> {
  const text = await readFile(join(world.root, '.context-brake/runtime/restart/pi', `${SESSION_ID}.json`), 'utf8').catch(() => '{"records":[]}');
  return (JSON.parse(text) as { records: { code: string }[] }).records.map((record) => record.code);
}

