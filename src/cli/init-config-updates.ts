import type { ContextBrakeConfig } from '../core/contracts/configuration.js';
import { mergeAutoRestart, type AutoRestartUpdate } from '../core/services/auto-restart-merge.js';
import { mergeDebugMode, type DebugModeUpdate } from '../core/services/debug-mode-merge.js';
import { mergeDelegatedSnapshot, type DelegatedSnapshotFlags, type DelegatedSnapshotUpdate } from '../core/services/delegated-snapshot-merge.js';
import { isLightModeInEffect, mergeLightMode, type LightModeFlags, type LightModeUpdate } from '../core/services/light-mode-merge.js';
import { CliArgumentError } from './argument-validator.js';
import type { ParsedInitArgs } from './init-arguments.js';

export type ConfigUpdates = { readonly delegatedSnapshot: DelegatedSnapshotUpdate; readonly lightMode: LightModeUpdate; readonly debug: DebugModeUpdate; readonly autoRestart: AutoRestartUpdate };
type LightOptionCheck = { readonly option: string; readonly used: (args: ParsedInitArgs) => boolean };

const KEEP = { kind: 'keep' } as const;
const LIGHT_MODE_OPTIONS: readonly LightOptionCheck[] = [
  { option: '--snapshot-command', used: (args) => args.delegatedSnapshot?.snapshotCommand !== undefined },
  { option: '--snapshot-path', used: (args) => (args.delegatedSnapshot?.allowedPaths.length ?? 0) > 0 },
  { option: '--snapshot-skill', used: (args) => (args.delegatedSnapshot?.allowedSkills.length ?? 0) > 0 },
  { option: '--resume-command', used: (args) => args.delegatedSnapshot?.resumeCommand !== undefined },
  { option: '--create-instructions', used: (args) => args.createInstructions },
  { option: '--migrate-legacy', used: (args) => args.migrateLegacy },
  { option: '--instruction-file', used: (args) => args.instructionFile.length > 0 },
];

export function planConfigUpdates(config: ContextBrakeConfig | null, args: ParsedInitArgs): ConfigUpdates {
  const flags: LightModeFlags = { light: args.light ?? false, noLight: args.noLight ?? false, triggerZone: args.delegatedSnapshot?.triggerZone };
  const debug = debugUpdate(config, args);
  const autoRestart = autoRestartUpdate(config, args);
  if (!isLightModeInEffect(config, flags)) {
    return { delegatedSnapshot: delegatedUpdate(config, args.delegatedSnapshot), lightMode: lightUpdate(config, { ...flags, triggerZone: undefined }), debug, autoRestart };
  }
  const lightMode = lightUpdate(config, flags);
  assertLightModeOptions(args);
  return { delegatedSnapshot: args.delegatedSnapshot?.remove === true ? { kind: 'remove' } : KEEP, lightMode, debug, autoRestart };
}
function autoRestartUpdate(config: ContextBrakeConfig | null, args: ParsedInitArgs): AutoRestartUpdate {
  const merge = mergeAutoRestart(config?.autoRestart, { autoRestart: args.autoRestart ?? false, noAutoRestart: args.noAutoRestart ?? false });
  if ('error' in merge) throw new CliArgumentError(merge.error);
  return merge.update;
}
function debugUpdate(config: ContextBrakeConfig | null, args: ParsedInitArgs): DebugModeUpdate {
  const merge = mergeDebugMode(config?.debug, { debug: args.debug ?? false, noDebug: args.noDebug ?? false });
  if ('error' in merge) throw new CliArgumentError(merge.error);
  return merge.update;
}
function lightUpdate(config: ContextBrakeConfig | null, flags: LightModeFlags): LightModeUpdate {
  const merge = mergeLightMode(config, flags);
  if ('error' in merge) throw new CliArgumentError(merge.error);
  return merge.update;
}
function delegatedUpdate(config: ContextBrakeConfig | null, flags: DelegatedSnapshotFlags | undefined): DelegatedSnapshotUpdate {
  if (flags === undefined) return KEEP;
  const merge = mergeDelegatedSnapshot(config?.delegatedSnapshot, flags);
  if ('error' in merge) throw new CliArgumentError(merge.error);
  return merge.update;
}
function assertLightModeOptions(args: ParsedInitArgs): void {
  const used = LIGHT_MODE_OPTIONS.find((check) => check.used(args));
  if (used === undefined) return;
  throw new CliArgumentError(`${used.option} is not available in the light mode. Remove the option, or leave the light mode with --no-light.`);
}
