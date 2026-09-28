export type DebugModeFlags = {
  readonly debug: boolean;
  readonly noDebug: boolean;
};
export type DebugModeUpdate = { readonly kind: 'keep' } | { readonly kind: 'set' } | { readonly kind: 'remove' };
export type DebugModeMerge = { readonly update: DebugModeUpdate } | { readonly error: string };
type DebugModeConfig = { readonly debug?: boolean | undefined; readonly lightMode?: unknown };

const DEBUG_KEY = 'debug';
const TOGGLE_CONFLICT = '--debug cannot be combined with --no-debug.';
const KEEP: DebugModeMerge = { update: { kind: 'keep' } };

export function isDebugModeInEffect(config: DebugModeConfig | null | undefined): boolean {
  return config?.debug === true && config.lightMode === undefined;
}
export function mergeDebugMode(current: boolean | undefined, flags: DebugModeFlags): DebugModeMerge {
  if (flags.debug && flags.noDebug) return { error: TOGGLE_CONFLICT };
  if (flags.noDebug) return current === undefined ? KEEP : { update: { kind: 'remove' } };
  if (flags.debug) return current === true ? KEEP : { update: { kind: 'set' } };
  return KEEP;
}
export function applyDebugMode<T extends { debug?: boolean | undefined }>(config: T, update: DebugModeUpdate): T {
  if (update.kind === 'keep') return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== DEBUG_KEY)) as T;
  return update.kind === 'remove' ? rest : { ...rest, debug: true };
}
