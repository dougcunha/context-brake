import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { configurationSchema } from '../../../core/contracts/configuration.js';
import { IDLE_GUARD_STATE, type GuardState, type RestartGuardStore, type StandDownFacts } from '../../../core/contracts/restart-host.js';
import type { RestartSettings } from '../../../core/services/restart-flow.js';
import { restartMode } from '../../../core/services/restart-mode.js';
import { isMissingFileError } from '../../runtime/runtime-paths.js';

export const RESTART_COMMAND = 'context-brake-restart';
export const RESTART_COMPONENT_VERSION = '1.0.0';
const CONFIG_FILE = 'context-brake.config.json';
const SWITCHED_OFF = '0';

const guards = new Map<string, GuardState>();
const turnStarts = new Map<string, number>();
const turnToolCalls = new Map<string, number>();

export function memoryGuardStore(root: string): RestartGuardStore {
  return {
    read: async () => guards.get(root) ?? IDLE_GUARD_STATE,
    write: async (state) => { guards.set(root, state); },
  };
}

export function startTurn(root: string, at: number): void {
  turnStarts.set(root, at);
  turnToolCalls.set(root, 0);
}

export function countToolCall(root: string): void {
  turnToolCalls.set(root, (turnToolCalls.get(root) ?? 0) + 1);
}

export function turnStartedAt(root: string): number | undefined {
  return turnStarts.get(root);
}

export function takeToolCalls(root: string): number {
  const calls = turnToolCalls.get(root) ?? 0;
  turnToolCalls.set(root, 0);
  return calls;
}

export function inProcessStandDown(interactive: boolean): StandDownFacts {
  return { disabledByEnv: process.env['CONTEXT_BRAKE_AUTO_RESTART'] === SWITCHED_OFF, interactive };
}

export async function readRestartSettings(root: string): Promise<RestartSettings | undefined> {
  try {
    const parsed = configurationSchema.safeParse(JSON.parse(await readFile(join(root, CONFIG_FILE), 'utf8')));
    if (!parsed.success || parsed.data.autoRestart === undefined) return undefined;
    return { maxConsecutive: parsed.data.autoRestart.maxConsecutiveRestarts, mode: restartMode(parsed.data) };
  } catch (error) {
    if (isMissingFileError(error) || error instanceof SyntaxError) return undefined;
    throw error;
  }
}
