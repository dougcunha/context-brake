import { DEFAULT_MAX_CONSECUTIVE_RESTARTS, type AutoRestartConfig } from '../contracts/auto-restart.js';

export type AutoRestartFlags = { readonly autoRestart: boolean; readonly noAutoRestart: boolean };
export type AutoRestartUpdate = { readonly kind: 'keep' } | { readonly kind: 'set' } | { readonly kind: 'remove' };
export type AutoRestartMerge = { readonly update: AutoRestartUpdate } | { readonly error: string };
type AutoRestartHolder = { readonly autoRestart?: AutoRestartConfig | undefined };

const AUTO_RESTART_KEY = 'autoRestart';
const TOGGLE_CONFLICT = '--auto-restart cannot be combined with --no-auto-restart.';
const KEEP: AutoRestartMerge = { update: { kind: 'keep' } };

export function mergeAutoRestart(current: AutoRestartConfig | undefined, flags: AutoRestartFlags): AutoRestartMerge {
  if (flags.autoRestart && flags.noAutoRestart) return { error: TOGGLE_CONFLICT };
  if (flags.noAutoRestart) return current === undefined ? KEEP : { update: { kind: 'remove' } };
  if (flags.autoRestart) return current === undefined ? { update: { kind: 'set' } } : KEEP;
  return KEEP;
}

export function applyAutoRestart<T extends AutoRestartHolder>(config: T, update: AutoRestartUpdate): T {
  if (update.kind === 'keep') return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== AUTO_RESTART_KEY)) as T;
  return update.kind === 'remove' ? rest : { ...rest, autoRestart: { maxConsecutiveRestarts: DEFAULT_MAX_CONSECUTIVE_RESTARTS } };
}

export function isAutoRestartWanted(current: AutoRestartConfig | undefined, update: AutoRestartUpdate): boolean {
  return update.kind === 'set' || (update.kind === 'keep' && current !== undefined);
}
