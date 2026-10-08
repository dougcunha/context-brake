import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RestartReasonCode } from '../../src/core/contracts/auto-restart.js';
import { restartLogSchema } from '../../src/core/contracts/restart-log.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { SESSION_RESET_SIGNAL } from '../../src/core/services/reset-notice.js';
import type { HookHandler, HookRegistrar, ModHost } from '../../src/infrastructure/harnesses/claude-code/mod/host.js';
import { MOD_LOG_DIR } from '../../src/infrastructure/harnesses/claude-code/mod/mod-info.js';
import { register } from '../../src/infrastructure/harnesses/claude-code/mod/register.js';
import { createHost, createHostState, flush, type HostState } from './claude-mod-host.js';

export type SceneOptions = { readonly autoRestart?: boolean; readonly max?: number; readonly handoff?: boolean };
export type Scene = { readonly root: string; readonly state: HostState; readonly host: ModHost; fire(event: string, input: unknown): Promise<unknown> };

const TURN_AGE_MS = 60_000;
const WAIT_FOR_CODES_MILLISECONDS = 2_000;
const roots: string[] = [];

async function writeConfig(root: string, options: SceneOptions): Promise<void> {
  const autoRestart = options.autoRestart === false ? {} : { autoRestart: { maxConsecutiveRestarts: options.max ?? 2 } };
  const snapshot = options.handoff === true ? DEFAULT_CONFIG.snapshot : { ...DEFAULT_CONFIG.snapshot, command: '/sdd-snapshot' };
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify({ ...DEFAULT_CONFIG, snapshot, ...autoRestart }), 'utf8');
}

function driver(host: ModHost): Pick<Scene, 'fire'> {
  const handlers = new Map<string, HookHandler<unknown>>();
  function on<E>(event: string, handler: HookHandler<E>): unknown {
    return handlers.set(event, handler as HookHandler<unknown>);
  }
  register(on satisfies HookRegistrar);
  return { async fire(event, input) { return handlers.get(event)?.(host, input, async (value) => value); } };
}

export async function startScene(options: SceneOptions): Promise<Scene> {
  const root = await mkdtemp(join(tmpdir(), 'cb-mod-'));
  roots.push(root);
  const startedAt = Date.now() - TURN_AGE_MS;
  await writeConfig(root, options);
  await mkdir(join(root, '.context-brake'), { recursive: true });
  const state = createHostState(startedAt);
  const host = createHost(root, state);
  return { root, state, host, ...driver(host) };
}

export type TurnOptions = { readonly extra?: Record<string, unknown>; readonly tools?: number };

export async function finishTurn(scene: Scene, answer: string, options: TurnOptions = {}): Promise<void> {
  await scene.fire('turn.start', { text: 'go', turnId: 'turn-1' });
  for (let call = 0; call < (options.tools ?? 0); call += 1) await scene.fire('tool.call', { tool: 'Bash' });
  await scene.fire('turn.complete', { answer, reason: 'answer', isAborted: false, durationMs: 1, turnId: 'turn-1', ...options.extra });
  await flush();
}

export async function signalTurn(scene: Scene, tools = 0): Promise<void> {
  await finishTurn(scene, `Saved.\n${SESSION_RESET_SIGNAL}`, { tools });
}

export async function settleClear(scene: Scene, outcome: 'resolve' | 'reject' = 'resolve'): Promise<void> {
  scene.state.clear?.settle(outcome);
  await flush();
}

export async function readCodes(scene: Scene): Promise<RestartReasonCode[]> {
  const text = await readFile(join(scene.root, MOD_LOG_DIR, 'session-1.json'), 'utf8').catch(() => '');
  const parsed = restartLogSchema.safeParse(text === '' ? undefined : JSON.parse(text));
  return parsed.success ? parsed.data.records.map((record) => record.code) : [];
}

export async function waitForCodes(scene: Scene, count: number): Promise<RestartReasonCode[]> {
  const deadline = Date.now() + WAIT_FOR_CODES_MILLISECONDS;
  let codes = await readCodes(scene);
  while (codes.length < count && Date.now() < deadline) {
    await flush();
    codes = await readCodes(scene);
  }
  return codes;
}

export async function cleanupScenes(): Promise<void> {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
}
