import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { modLogSchema, type RestartReasonCode } from '../../src/core/contracts/auto-restart.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { SESSION_RESET_SIGNAL } from '../../src/core/services/reset-notice.js';
import type { HookHandler, HookRegistrar, ModHost } from '../../src/infrastructure/harnesses/claude-code/mod/host.js';
import { register } from '../../src/infrastructure/harnesses/claude-code/mod/register.js';
import { createHost, createHostState, flush, type HostState } from './claude-mod-host.js';

export type CheckpointKind = 'valid' | 'missing' | 'invalid' | 'stale' | 'no-step';
export type SceneOptions = { readonly mode: 'full' | 'light'; readonly autoRestart?: boolean; readonly max?: number; readonly checkpoint?: CheckpointKind; readonly plan?: boolean };
export type Scene = { readonly root: string; readonly state: HostState; readonly host: ModHost; fire(event: string, input: unknown): Promise<unknown> };

const TURN_AGE_MS = 60_000;
const WAIT_FOR_CODES_MILLISECONDS = 2_000;
const roots: string[] = [];

async function writeCheckpoint(root: string, kind: CheckpointKind, startedAt: number): Promise<void> {
  if (kind === 'missing') return;
  const path = join(root, 'state_checkpoint.json');
  const body = kind === 'invalid' ? '{ not json' : JSON.stringify({ schemaVersion: 1, taskId: 't', activeStepId: kind === 'no-step' ? null : 1, gitState: { branch: null, lastCommitHash: null, cleanWorkingTree: null }, workingMemory: {}, modifiedFiles: [], timestamp: '2026-10-04T21:00:00.000Z' });
  await writeFile(path, body, 'utf8');
  if (kind === 'stale') await utimes(path, (startedAt - 120_000) / 1000, (startedAt - 120_000) / 1000);
}

async function writeConfig(root: string, options: SceneOptions): Promise<void> {
  const modeBlock = options.mode === 'full' ? { fullMode: true as const } : { lightMode: { triggerZone: 'RED' as const } };
  const autoRestart = options.autoRestart === false ? {} : { autoRestart: { maxConsecutiveRestarts: options.max ?? 2 } };
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify({ ...DEFAULT_CONFIG, ...modeBlock, ...autoRestart }), 'utf8');
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
  await writeCheckpoint(root, options.checkpoint ?? 'valid', startedAt);
  if (options.plan === true) await writeFile(join(root, 'task_plan.json'), '{}', 'utf8');
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
  const text = await readFile(join(scene.root, '.context-brake/runtime/claude-mod/session-1.json'), 'utf8').catch(() => '');
  const parsed = modLogSchema.safeParse(text === '' ? undefined : JSON.parse(text));
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
