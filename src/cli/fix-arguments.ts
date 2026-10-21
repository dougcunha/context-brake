import { parseArgs } from 'node:util';
import type { HarnessId } from '../core/contracts/harness.js';
import { CliArgumentError, validateHarnessIds } from './argument-validator.js';

export type ParsedFixArgs = { command: 'fix'; dryRun: boolean; yes: boolean; force: boolean; json: boolean; harness: readonly HarnessId[] };

const FIX_OPTIONS = {
  'dry-run': { type: 'boolean', default: false }, yes: { type: 'boolean', short: 'y', default: false },
  force: { type: 'boolean', default: false }, json: { type: 'boolean', default: false },
  harness: { type: 'string', multiple: true, default: [] as string[] },
} as const;

const JSON_NEEDS_CONSENT = '--json needs --yes or --dry-run, because fix --json never asks questions.';
const FORCE_NEEDS_CONSENT = '--force needs --yes or --dry-run. On a terminal, fix asks each decision instead.';

export function parseFix(args: readonly string[]): ParsedFixArgs {
  const { values } = parseArgs({ args: [...args], options: FIX_OPTIONS, strict: true });
  const isUnattended = values.yes || values['dry-run'];
  if (values.json && !isUnattended) throw new CliArgumentError(JSON_NEEDS_CONSENT);
  if (values.force && !isUnattended) throw new CliArgumentError(FORCE_NEEDS_CONSENT);
  return { command: 'fix', dryRun: values['dry-run'], yes: values.yes, force: values.force, json: values.json, harness: validateHarnessIds(values.harness) };
}
