import { delegatedSnapshotSchema, type DelegatedSnapshotConfig } from '../contracts/configuration.js';

export type DelegatedSnapshotFlags = {
  readonly snapshotCommand?: string | undefined;
  readonly triggerZone?: string | undefined;
  readonly resumeCommand?: string | undefined;
  readonly allowedPaths: readonly string[];
  readonly allowedSkills: readonly string[];
  readonly remove: boolean;
};
export type DelegatedSnapshotUpdate = { readonly kind: 'keep' } | { readonly kind: 'remove' } | { readonly kind: 'set'; readonly section: DelegatedSnapshotConfig };
export type DelegatedSnapshotMerge = { readonly update: DelegatedSnapshotUpdate } | { readonly error: string };

const SECTION_PATH = 'delegatedSnapshot';
const REMOVE_CONFLICT = '--no-delegated-snapshot cannot be combined with other delegated snapshot options.';
const COMMAND_REQUIRED = '--snapshot-command is required when the configuration has no delegatedSnapshot section.';

export function hasDelegatedFlags(flags: DelegatedSnapshotFlags): boolean {
  return [flags.snapshotCommand, flags.triggerZone, flags.resumeCommand].some((value) => value !== undefined) || flags.allowedPaths.length > 0 || flags.allowedSkills.length > 0;
}
export function mergeDelegatedSnapshot(current: DelegatedSnapshotConfig | undefined, flags: DelegatedSnapshotFlags): DelegatedSnapshotMerge {
  const changing = hasDelegatedFlags(flags);
  if (flags.remove) return changing ? { error: REMOVE_CONFLICT } : { update: { kind: 'remove' } };
  if (!changing) return { update: { kind: 'keep' } };
  if (current === undefined && flags.snapshotCommand === undefined) return { error: COMMAND_REQUIRED };
  const candidate = { ...current, ...definedFields(flags) };
  const result = delegatedSnapshotSchema.safeParse(candidate);
  if (result.success) return { update: { kind: 'set', section: result.data } };
  const issue = result.error.issues[0];
  const path = [SECTION_PATH, ...(issue?.path ?? [])].join('.');
  return { error: `Invalid delegated snapshot option: ${path} ${issue?.message ?? 'is invalid'}.` };
}
export function applyDelegatedSnapshot<T extends { delegatedSnapshot?: DelegatedSnapshotConfig | undefined }>(config: T, update: DelegatedSnapshotUpdate): T {
  if (update.kind === 'keep') return config;
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== SECTION_PATH)) as T;
  return update.kind === 'remove' ? rest : { ...rest, delegatedSnapshot: update.section };
}
function definedFields(flags: DelegatedSnapshotFlags): Record<string, unknown> {
  return Object.fromEntries(Object.entries({
    snapshotCommand: flags.snapshotCommand,
    triggerZone: flags.triggerZone,
    resumeCommand: flags.resumeCommand,
    allowedPaths: flags.allowedPaths.length > 0 ? [...flags.allowedPaths] : undefined,
    allowedSkills: flags.allowedSkills.length > 0 ? [...flags.allowedSkills] : undefined,
  }).filter(([, value]) => value !== undefined));
}
