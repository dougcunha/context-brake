import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { createOmpRestartExtension, type OmpRestartApi, type OmpRestartContext } from '../../src/infrastructure/harnesses/oh-my-pi/restart.js';
import { loadHarnessPayload } from './harness-payloads.js';

export async function writeConfig(root: string, overrides: Record<string, unknown> = {}): Promise<void> {
  const config = { ...DEFAULT_CONFIG, snapshot: { ...DEFAULT_CONFIG.snapshot, command: '/sdd-snapshot' }, autoRestart: { maxConsecutiveRestarts: 2 }, ...overrides };
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
}

type Handler = (payload: Record<string, unknown>, context: OmpRestartContext) => Promise<unknown>;
export type World = { readonly root: string; readonly handlers: Map<string, Handler>; readonly sent: string[]; editor: string; sessions: number };

const SESSION_ID = 'omp-session-1';

function contextOf(world: World): OmpRestartContext {
  return {
    cwd: world.root, mode: 'tui', hasUI: true,
    sessionManager: { getSessionId: () => SESSION_ID },
    ui: { notify: () => undefined, getEditorText: () => world.editor, setEditorText: (text) => { world.editor = text; } },
    newSession: async () => { world.sessions += 1; return { cancelled: false }; },
  };
}

export function createWorld(root: string): World {
  const world: World = { root, handlers: new Map(), sent: [], editor: '', sessions: 0 };
  const api: OmpRestartApi = {
    on: (event, handler) => { world.handlers.set(event, handler); },
    registerCommand: (name, command) => { world.handlers.set(`/${name}`, (_payload, context) => command.handler('', context)); },
    sendUserMessage: (text) => { world.sent.push(text); },
  };
  createOmpRestartExtension(api);
  return world;
}

export async function fire(world: World, event: string, payload: unknown = {}): Promise<void> {
  await world.handlers.get(event)!(payload as Record<string, unknown>, contextOf(world));
}

export async function signalTurn(world: World): Promise<void> {
  await fire(world, 'agent_start');
  await fire(world, 'tool_result');
  await fire(world, 'session_stop', await loadHarnessPayload('oh-my-pi', 'session-stop-reset.json'));
}

export async function pressEnter(world: World): Promise<void> {
  await fire(world, 'input', { source: 'interactive', text: world.editor });
  const command = world.editor;
  world.editor = '';
  await fire(world, command);
}

export async function codes(world: World): Promise<string[]> {
  const text = await readFile(join(world.root, '.context-brake/runtime/restart/oh-my-pi', `${SESSION_ID}.json`), 'utf8').catch(() => '{"records":[]}');
  return (JSON.parse(text) as { records: { code: string }[] }).records.map((record) => record.code);
}
