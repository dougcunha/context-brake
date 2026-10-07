import { parseArgs } from 'node:util';
import type { StatuslineBridgeRequest } from '../core/contracts/adapter.js';
import type { HarnessDetection, HarnessId } from '../core/contracts/harness.js';
import type { SnapshotFlags } from '../core/services/snapshot-merge.js';
import { CliArgumentError, validateHarnessIds, validateInclusionExclusion } from './argument-validator.js';

export type ParsedInitArgs = {
  command: 'init'; dryRun: boolean; yes: boolean; json: boolean;
  harness: readonly HarnessId[]; excludeHarness: readonly HarnessId[];
  snapshot?: SnapshotFlags | undefined;
  debug?: boolean | undefined; noDebug?: boolean | undefined;
  statuslineBridge?: StatuslineBridgeRequest | undefined;
  autoRestart?: boolean | undefined; noAutoRestart?: boolean | undefined;
};

const INIT_OPTIONS = {
  'dry-run': { type: 'boolean', default: false }, yes: { type: 'boolean', short: 'y', default: false },
  'json': { type: 'boolean', default: false }, harness: { type: 'string', multiple: true, default: [] as string[] },
  'exclude-harness': { type: 'string', multiple: true, default: [] as string[] },
  'snapshot-command': { type: 'string' }, 'snapshot-trigger': { type: 'string' }, 'resume-command': { type: 'string' },
  'no-snapshot-command': { type: 'boolean', default: false },
  debug: { type: 'boolean', default: false }, 'no-debug': { type: 'boolean', default: false },
  'statusline-bridge': { type: 'boolean', default: false }, 'no-statusline-bridge': { type: 'boolean', default: false },
  'auto-restart': { type: 'boolean', default: false }, 'no-auto-restart': { type: 'boolean', default: false },
} as const;
type InitValues = ReturnType<typeof parseArgs<{ args: string[]; options: typeof INIT_OPTIONS; strict: true }>>['values'];

export function parseInit(args: readonly string[]): ParsedInitArgs {
  const { values } = parseArgs({ args: [...args], options: INIT_OPTIONS, strict: true });
  const harness = validateHarnessIds(values.harness);
  const excludeHarness = validateHarnessIds(values['exclude-harness']);
  validateInclusionExclusion(harness, excludeHarness);
  assertAutoRestartHarnesses(values, { harness, excludeHarness });
  return {
    command: 'init', dryRun: values['dry-run'], yes: values.yes, json: values.json,
    harness, excludeHarness,
    snapshot: snapshotFlags(values), debug: values.debug, noDebug: values['no-debug'], statuslineBridge: statuslineBridgeRequest(values, { harness, excludeHarness }),
    autoRestart: values['auto-restart'], noAutoRestart: values['no-auto-restart'],
  };
}
export function harnessSelection(args: ParsedInitArgs) {
  return {
    ...(args.harness.length > 0 ? { include: args.harness } : {}),
    ...(args.excludeHarness.length > 0 ? { exclude: args.excludeHarness } : {}),
  };
}
function snapshotFlags(values: InitValues): SnapshotFlags {
  return { command: values['snapshot-command'], triggerZone: values['snapshot-trigger'], resumeCommand: values['resume-command'], clearCommand: values['no-snapshot-command'] };
}
const STATUSLINE_TARGET_ERROR = '--statusline-bridge and --no-statusline-bridge require claude-code among the target harnesses.';
type HarnessTargets = { readonly harness: readonly HarnessId[]; readonly excludeHarness: readonly HarnessId[] };
function statuslineBridgeRequest(values: InitValues, targets: HarnessTargets): StatuslineBridgeRequest | undefined {
  const install = values['statusline-bridge'];
  const remove = values['no-statusline-bridge'];
  if (install && remove) throw new CliArgumentError('--statusline-bridge cannot be combined with --no-statusline-bridge.');
  if (!install && !remove) return undefined;
  const isClaudeExcluded = targets.excludeHarness.includes('claude-code') || (targets.harness.length > 0 && !targets.harness.includes('claude-code'));
  if (isClaudeExcluded) throw new CliArgumentError(STATUSLINE_TARGET_ERROR);
  return install ? 'install' : 'remove';
}
const AUTO_RESTART_TARGET_ERROR = '--auto-restart and --no-auto-restart require claude-code among the target harnesses.';
function assertAutoRestartHarnesses(values: InitValues, targets: HarnessTargets): void {
  if (!values['auto-restart'] && !values['no-auto-restart']) return;
  const isClaudeExcluded = targets.excludeHarness.includes('claude-code') || (targets.harness.length > 0 && !targets.harness.includes('claude-code'));
  if (isClaudeExcluded) throw new CliArgumentError(AUTO_RESTART_TARGET_ERROR);
}
export function assertAutoRestartTarget(args: ParsedInitArgs, detections: readonly HarnessDetection[]): void {
  if (!args.autoRestart && !args.noAutoRestart) return;
  if (detections.some((detection) => detection.harness === 'claude-code' && detection.state === 'project')) return;
  throw new CliArgumentError(AUTO_RESTART_TARGET_ERROR);
}
export function assertStatuslineBridgeTarget(request: StatuslineBridgeRequest | undefined, detections: readonly HarnessDetection[]): void {
  if (request === undefined) return;
  const isClaudeActive = detections.some((detection) => detection.harness === 'claude-code' && detection.state === 'project');
  if (!isClaudeActive) throw new CliArgumentError(STATUSLINE_TARGET_ERROR);
}
