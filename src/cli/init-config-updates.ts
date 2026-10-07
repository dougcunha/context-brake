import type { ContextBrakeConfig } from '../core/contracts/configuration.js';
import { mergeAutoRestart, type AutoRestartUpdate } from '../core/services/auto-restart-merge.js';
import { mergeDebugMode, type DebugModeUpdate } from '../core/services/debug-mode-merge.js';
import { mergeSnapshot, type SnapshotFlags, type SnapshotUpdate } from '../core/services/snapshot-merge.js';
import { CliArgumentError } from './argument-validator.js';
import type { ParsedInitArgs } from './init-arguments.js';

export type ConfigUpdates = { readonly snapshot: SnapshotUpdate; readonly debug: DebugModeUpdate; readonly autoRestart: AutoRestartUpdate };

const KEEP = { kind: 'keep' } as const;

export function planConfigUpdates(config: ContextBrakeConfig | null, args: ParsedInitArgs): ConfigUpdates {
  return { snapshot: snapshotUpdate(config, args.snapshot), debug: debugUpdate(config, args), autoRestart: autoRestartUpdate(config, args) };
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
function snapshotUpdate(config: ContextBrakeConfig | null, flags: SnapshotFlags | undefined): SnapshotUpdate {
  if (flags === undefined) return KEEP;
  const merge = mergeSnapshot(config?.snapshot, flags);
  if ('error' in merge) throw new CliArgumentError(merge.error);
  return merge.update;
}
