import { snapshotSchema, type SnapshotConfig } from '../contracts/configuration.js';

export type SnapshotFlags = {
  readonly command?: string | undefined;
  readonly triggerZone?: string | undefined;
  readonly resumeCommand?: string | undefined;
  readonly clearCommand: boolean;
};
export type SnapshotUpdate = { readonly kind: 'keep' } | { readonly kind: 'set'; readonly section: SnapshotConfig };
export type SnapshotMerge = { readonly update: SnapshotUpdate } | { readonly error: string };

const SECTION_PATH = 'snapshot';
const CLEAR_CONFLICT = '--no-snapshot-command cannot be combined with --snapshot-command or --resume-command.';

export function mergeSnapshot(current: SnapshotConfig | undefined, flags: SnapshotFlags): SnapshotMerge {
  if (flags.clearCommand && (flags.command !== undefined || flags.resumeCommand !== undefined)) return { error: CLEAR_CONFLICT };
  if (!flags.clearCommand && [flags.command, flags.triggerZone, flags.resumeCommand].every((value) => value === undefined)) return { update: { kind: 'keep' } };
  const base = flags.clearCommand ? { triggerZone: current?.triggerZone } : { ...current };
  const result = snapshotSchema.safeParse(withoutUndefined({ ...base, ...definedFields(flags) }));
  if (result.success) return { update: { kind: 'set', section: result.data } };
  const issue = result.error.issues[0];
  const path = [SECTION_PATH, ...(issue?.path ?? [])].join('.');
  return { error: `Invalid snapshot option: ${path} ${issue?.message ?? 'is invalid'}.` };
}
export function applySnapshot<T extends { snapshot?: SnapshotConfig | undefined }>(config: T, update: SnapshotUpdate): T {
  return update.kind === 'keep' ? config : { ...config, snapshot: update.section };
}
function definedFields(flags: SnapshotFlags): Record<string, unknown> {
  return withoutUndefined({ command: flags.command, triggerZone: flags.triggerZone, resumeCommand: flags.resumeCommand });
}
function withoutUndefined(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
