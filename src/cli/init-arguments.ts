import { parseArgs } from 'node:util';
import type { StatuslineBridgeRequest } from '../core/contracts/adapter.js';
import type { HarnessDetection, HarnessId } from '../core/contracts/harness.js';
import type { DelegatedSnapshotFlags } from '../core/services/delegated-snapshot-merge.js';
import { CliArgumentError, validateHarnessIds, validateInclusionExclusion, validateInstructionPaths } from './argument-validator.js';

export type ParsedInitArgs = {
  command: 'init'; dryRun: boolean; yes: boolean; json: boolean;
  harness: readonly HarnessId[]; excludeHarness: readonly HarnessId[];
  instructionFile: readonly string[]; createInstructions: boolean; migrateLegacy: boolean;
  delegatedSnapshot?: DelegatedSnapshotFlags | undefined;
  statuslineBridge?: StatuslineBridgeRequest | undefined;
};

const INIT_OPTIONS = {
  'dry-run': { type: 'boolean', default: false }, yes: { type: 'boolean', short: 'y', default: false },
  'json': { type: 'boolean', default: false }, harness: { type: 'string', multiple: true, default: [] as string[] },
  'exclude-harness': { type: 'string', multiple: true, default: [] as string[] },
  'instruction-file': { type: 'string', multiple: true, default: [] as string[] },
  'create-instructions': { type: 'boolean', default: false },
  'migrate-legacy': { type: 'boolean', default: false },
  'snapshot-command': { type: 'string' }, 'snapshot-trigger': { type: 'string' }, 'resume-command': { type: 'string' },
  'snapshot-path': { type: 'string', multiple: true, default: [] as string[] }, 'snapshot-skill': { type: 'string', multiple: true, default: [] as string[] },
  'no-delegated-snapshot': { type: 'boolean', default: false },
  'statusline-bridge': { type: 'boolean', default: false }, 'no-statusline-bridge': { type: 'boolean', default: false },
} as const;
type InitValues = ReturnType<typeof parseArgs<{ args: string[]; options: typeof INIT_OPTIONS; strict: true }>>['values'];

export function parseInit(args: readonly string[]): ParsedInitArgs {
  const { values } = parseArgs({ args: [...args], options: INIT_OPTIONS, strict: true });
  const harness = validateHarnessIds(values.harness);
  const excludeHarness = validateHarnessIds(values['exclude-harness']);
  validateInclusionExclusion(harness, excludeHarness);
  return {
    command: 'init', dryRun: values['dry-run'], yes: values.yes, json: values.json,
    harness, excludeHarness, instructionFile: validateInstructionPaths(values['instruction-file']),
    createInstructions: values['create-instructions'], migrateLegacy: values['migrate-legacy'],
    delegatedSnapshot: delegatedFlags(values), statuslineBridge: statuslineBridgeRequest(values, { harness, excludeHarness }),
  };
}
function delegatedFlags(values: InitValues): DelegatedSnapshotFlags {
  return {
    snapshotCommand: values['snapshot-command'], triggerZone: values['snapshot-trigger'], resumeCommand: values['resume-command'],
    allowedPaths: values['snapshot-path'], allowedSkills: values['snapshot-skill'], remove: values['no-delegated-snapshot'],
  };
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
export function assertStatuslineBridgeTarget(request: StatuslineBridgeRequest | undefined, detections: readonly HarnessDetection[]): void {
  if (request === undefined) return;
  const isClaudeActive = detections.some((detection) => detection.harness === 'claude-code' && detection.state === 'project');
  if (!isClaudeActive) throw new CliArgumentError(STATUSLINE_TARGET_ERROR);
}
