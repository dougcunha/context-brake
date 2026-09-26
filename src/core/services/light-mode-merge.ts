import { lightModeSchema, type LightModeConfig } from '../contracts/light-mode.js';

export type LightModeFlags = {
  readonly light: boolean;
  readonly noLight: boolean;
  readonly triggerZone?: string | undefined;
};
export type LightModeUpdate = { readonly kind: 'keep' } | { readonly kind: 'remove' } | { readonly kind: 'set'; readonly section: LightModeConfig };
export type LightModeMerge = { readonly update: LightModeUpdate } | { readonly error: string };

const SECTION_PATH = 'lightMode';
const TOGGLE_CONFLICT = '--light cannot be combined with --no-light.';
const KEEP: LightModeMerge = { update: { kind: 'keep' } };

export function isLightModeInEffect(current: LightModeConfig | undefined, flags: LightModeFlags): boolean {
  return flags.light || (current !== undefined && !flags.noLight);
}
export function mergeLightMode(current: LightModeConfig | undefined, flags: LightModeFlags): LightModeMerge {
  if (flags.light && flags.noLight) return { error: TOGGLE_CONFLICT };
  if (flags.noLight) return current === undefined ? KEEP : { update: { kind: 'remove' } };
  if (!isLightModeInEffect(current, flags)) return KEEP;
  if (current !== undefined && flags.triggerZone === undefined) return KEEP;
  const result = lightModeSchema.safeParse({ ...current, ...(flags.triggerZone === undefined ? {} : { triggerZone: flags.triggerZone }) });
  if (result.success) return { update: { kind: 'set', section: result.data } };
  const issue = result.error.issues[0];
  const path = [SECTION_PATH, ...(issue?.path ?? [])].join('.');
  return { error: `Invalid light mode option: ${path} ${issue?.message ?? 'is invalid'}.` };
}
export function applyLightMode<T extends { lightMode?: LightModeConfig | undefined }>(config: T, update: LightModeUpdate): T {
  if (update.kind === 'keep') return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== SECTION_PATH)) as T;
  return update.kind === 'remove' ? rest : { ...rest, lightMode: update.section };
}
