import { DEFAULT_MAX_CONSECUTIVE_RESTARTS, type AutoRestartConfig } from '../contracts/auto-restart.js';

export type AutoRestartFlags = { readonly autoRestart: boolean; readonly noAutoRestart: boolean; readonly maxRestarts?: number | undefined };
export type AutoRestartUpdate = { readonly kind: 'keep' } | { readonly kind: 'set'; readonly maxConsecutiveRestarts?: number | undefined } | { readonly kind: 'remove' };
export type AutoRestartMerge = { readonly update: AutoRestartUpdate } | { readonly error: string };
type AutoRestartHolder = { readonly autoRestart?: AutoRestartConfig | undefined };

const AUTO_RESTART_KEY = 'autoRestart';
const TOGGLE_CONFLICT = '--auto-restart cannot be combined with --no-auto-restart.';
const LIMIT_NEEDS_RESTART = '--max-restarts needs restart to be on: add --auto-restart.';
const KEEP: AutoRestartMerge = { update: { kind: 'keep' } };

export function mergeAutoRestart(current: AutoRestartConfig | undefined, flags: AutoRestartFlags): AutoRestartMerge {
  if (flags.autoRestart && flags.noAutoRestart) return { error: TOGGLE_CONFLICT };
  if (flags.noAutoRestart) return current === undefined ? KEEP : { update: { kind: 'remove' } };
  if (flags.maxRestarts !== undefined) return mergeLimit(current, flags.maxRestarts, flags.autoRestart);
  if (flags.autoRestart) return current === undefined ? { update: { kind: 'set' } } : KEEP;
  return KEEP;
}

function mergeLimit(current: AutoRestartConfig | undefined, limit: number, autoRestart: boolean): AutoRestartMerge {
  if (current === undefined && !autoRestart) return { error: LIMIT_NEEDS_RESTART };
  return current?.maxConsecutiveRestarts === limit ? KEEP : { update: { kind: 'set', maxConsecutiveRestarts: limit } };
}

export function applyAutoRestart<T extends AutoRestartHolder>(config: T, update: AutoRestartUpdate): T {
  if (update.kind === 'keep') return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== AUTO_RESTART_KEY)) as T;
  return update.kind === 'remove' ? rest : { ...rest, autoRestart: { maxConsecutiveRestarts: update.maxConsecutiveRestarts ?? DEFAULT_MAX_CONSECUTIVE_RESTARTS } };
}

export function isAutoRestartWanted(current: AutoRestartConfig | undefined, update: AutoRestartUpdate): boolean {
  return update.kind === 'set' || (update.kind === 'keep' && current !== undefined);
}
