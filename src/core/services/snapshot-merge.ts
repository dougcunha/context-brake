import { snapshotSchema, type SnapshotConfig } from '../contracts/configuration.js';

export type SnapshotFlags = {
  readonly command?: string | undefined;
  readonly triggerZone?: string | undefined;
  readonly triggerPercentage?: number | undefined;
  readonly resumeCommand?: string | undefined;
  readonly clearCommand: boolean;
};
export type SnapshotUpdate = { readonly kind: 'keep' } | { readonly kind: 'set'; readonly section: SnapshotConfig };
export type SnapshotMerge = { readonly update: SnapshotUpdate } | { readonly error: string };

const SECTION_PATH = 'snapshot';
const CONFIG_FILE = 'context-brake.config.json';
const FLAG_BY_FIELD: Readonly<Record<string, string>> = { command: '--snapshot-command <skill>', resumeCommand: '--resume-command <skill>', triggerZone: '--snapshot-trigger <YELLOW|RED>', triggerPercentage: '--snapshot-trigger-percentage <1-100>' };
const CLEAR_CONFLICT = '--no-snapshot-command cannot be combined with --snapshot-command or --resume-command.';

export function mergeSnapshot(current: SnapshotConfig | undefined, flags: SnapshotFlags): SnapshotMerge {
  if (flags.clearCommand && (flags.command !== undefined || flags.resumeCommand !== undefined)) return { error: CLEAR_CONFLICT };
  if (!flags.clearCommand && [flags.command, flags.triggerZone, flags.triggerPercentage, flags.resumeCommand].every((value) => value === undefined)) return { update: { kind: 'keep' } };
  const result = snapshotSchema.safeParse(withoutUndefined({ ...baseSection(current, flags), ...definedFields(flags) }));
  if (result.success) return { update: { kind: 'set', section: result.data } };
  const issue = result.error.issues[0];
  const path = [SECTION_PATH, ...(issue?.path ?? [])].join('.');
  const flag = FLAG_BY_FIELD[String(issue?.path[0])];
  const where = flag === undefined ? '' : ` Set it with ${flag} or in ${CONFIG_FILE}.`;
  return { error: `Invalid snapshot option: ${path} ${issue?.message ?? 'is invalid'}.${where}` };
}
export function applySnapshot<T extends { snapshot?: SnapshotConfig | undefined }>(config: T, update: SnapshotUpdate): T {
  return update.kind === 'keep' ? config : { ...config, snapshot: update.section };
}
function baseSection(current: SnapshotConfig | undefined, flags: SnapshotFlags): Record<string, unknown> {
  const trigger = { triggerZone: current?.triggerZone, triggerPercentage: flags.triggerZone === undefined ? current?.triggerPercentage : undefined };
  return flags.clearCommand ? trigger : { ...current, ...trigger };
}
function definedFields(flags: SnapshotFlags): Record<string, unknown> {
  return withoutUndefined({ command: flags.command, triggerZone: flags.triggerZone, triggerPercentage: flags.triggerPercentage, resumeCommand: flags.resumeCommand });
}
function withoutUndefined(values: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
