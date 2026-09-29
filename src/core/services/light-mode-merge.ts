import type { ContextBrakeConfig } from '../contracts/configuration.js';
import { lightModeSchema, type LightModeConfig } from '../contracts/light-mode.js';

export type LightModeFlags = {
  readonly light: boolean;
  readonly noLight: boolean;
  readonly triggerZone?: string | undefined;
};
export type LightModeUpdate = { readonly kind: 'keep' } | { readonly kind: 'set'; readonly section: LightModeConfig } | { readonly kind: 'full' };
export type LightModeMerge = { readonly update: LightModeUpdate } | { readonly error: string };
export type LightModeSource = Pick<ContextBrakeConfig, 'lightMode' | 'fullMode'> | null | undefined;

const SECTION_PATH = 'lightMode';
const FULL_MODE_KEY = 'fullMode';
const TOGGLE_CONFLICT = '--light cannot be combined with --no-light.';
const KEEP: LightModeMerge = { update: { kind: 'keep' } };
const FULL: LightModeMerge = { update: { kind: 'full' } };

export function isLightModeInEffect(config: LightModeSource, flags: LightModeFlags): boolean {
  return flags.light || (!flags.noLight && config?.fullMode !== true);
}
export function mergeLightMode(config: LightModeSource, flags: LightModeFlags): LightModeMerge {
  if (flags.light && flags.noLight) return { error: TOGGLE_CONFLICT };
  if (flags.noLight) return config?.fullMode === true ? KEEP : FULL;
  if (!isLightModeInEffect(config, flags)) return KEEP;
  if (config?.lightMode !== undefined && flags.triggerZone === undefined) return KEEP;
  return sectionUpdate(config?.lightMode, flags);
}
function sectionUpdate(current: LightModeConfig | undefined, flags: LightModeFlags): LightModeMerge {
  const result = lightModeSchema.safeParse({ ...current, ...(flags.triggerZone === undefined ? {} : { triggerZone: flags.triggerZone }) });
  if (result.success) return { update: { kind: 'set', section: result.data } };
  const issue = result.error.issues[0];
  const path = [SECTION_PATH, ...(issue?.path ?? [])].join('.');
  return { error: `Invalid light mode option: ${path} ${issue?.message ?? 'is invalid'}.` };
}
export function applyLightMode<T extends { lightMode?: LightModeConfig | undefined; fullMode?: true | undefined }>(config: T, update: LightModeUpdate): T {
  if (update.kind === 'keep') return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== SECTION_PATH && key !== FULL_MODE_KEY)) as T;
  return update.kind === 'full' ? { ...rest, fullMode: true } : { ...rest, lightMode: update.section };
}
