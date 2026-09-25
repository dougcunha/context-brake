import { parseArgs } from 'node:util';
import type { HarnessId } from '../core/contracts/harness.js';
import type { DelegatedSnapshotFlags } from '../core/services/delegated-snapshot-merge.js';
import { validateHarnessIds, validateInclusionExclusion, validateInstructionPaths } from './argument-validator.js';

export type ParsedInitArgs = {
  command: 'init'; dryRun: boolean; yes: boolean; json: boolean;
  harness: readonly HarnessId[]; excludeHarness: readonly HarnessId[];
  instructionFile: readonly string[]; createInstructions: boolean; migrateLegacy: boolean;
  delegatedSnapshot?: DelegatedSnapshotFlags | undefined;
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
    delegatedSnapshot: delegatedFlags(values),
  };
}
function delegatedFlags(values: InitValues): DelegatedSnapshotFlags {
  return {
    snapshotCommand: values['snapshot-command'], triggerZone: values['snapshot-trigger'], resumeCommand: values['resume-command'],
    allowedPaths: values['snapshot-path'], allowedSkills: values['snapshot-skill'], remove: values['no-delegated-snapshot'],
  };
}
