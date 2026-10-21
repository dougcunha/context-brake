import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GuardState } from '../../src/core/contracts/restart-host.js';
import type { CommandRunResult } from '../../src/infrastructure/harnesses/claude-code/mod/host.js';
import { HANDOFF_COMMAND_NAME, MOD_LOG_DIR } from '../../src/infrastructure/harnesses/claude-code/mod/mod-info.js';
import { flush } from './claude-mod-host.js';
import type { Scene } from './claude-mod-scene.js';

function guardKey(scene: Scene): string {
  return `contextbrake:autorestart:${scene.root}`;
}

export function setGuard(scene: Scene, state: GuardState): void {
  scene.state.store.set(guardKey(scene), state);
}

export function readGuard(scene: Scene): unknown {
  return scene.state.store.get(guardKey(scene));
}

export async function startSession(scene: Scene): Promise<void> {
  await scene.fire('session.start', { cwd: scene.root });
}

export async function runHandoff(scene: Scene, args = ''): Promise<CommandRunResult> {
  const result: unknown = await scene.fire('command.run', { command: HANDOFF_COMMAND_NAME, args, origin: { kind: 'composer' } });
  await flush();
  return typeof result === 'object' && result !== null && 'text' in result && typeof result.text === 'string' ? { text: result.text } : {};
}

export async function readLogText(scene: Scene): Promise<string> {
  return readFile(join(scene.root, MOD_LOG_DIR, 'session-1.json'), 'utf8').catch(() => '');
}
