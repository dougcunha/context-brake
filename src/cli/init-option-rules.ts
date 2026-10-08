import { MAX_CONSECUTIVE_RESTARTS, MIN_CONSECUTIVE_RESTARTS } from '../core/contracts/auto-restart.js';
import { CliArgumentError } from './argument-validator.js';

const MAX_RESTARTS_RULE = `--max-restarts must be an integer from ${MIN_CONSECUTIVE_RESTARTS} to ${MAX_CONSECUTIVE_RESTARTS}.`;
const MAX_RESTARTS_CONFLICT = '--max-restarts cannot be combined with --no-auto-restart.';
const INTEGER_PATTERN = /^\d+$/;

export function parseMaxRestarts(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = INTEGER_PATTERN.test(value) ? Number(value) : Number.NaN;
  if (!(parsed >= MIN_CONSECUTIVE_RESTARTS && parsed <= MAX_CONSECUTIVE_RESTARTS)) throw new CliArgumentError(MAX_RESTARTS_RULE);
  return parsed;
}

export function assertMaxRestartsCompatible(maxRestarts: number | undefined, noAutoRestart: boolean): void {
  if (maxRestarts !== undefined && noAutoRestart) throw new CliArgumentError(MAX_RESTARTS_CONFLICT);
}

export function assertInteractiveCompatible(flags: { readonly interactive: boolean; readonly yes: boolean; readonly json: boolean }): void {
  if (!flags.interactive) return;
  if (flags.yes) throw new CliArgumentError('--interactive cannot be combined with --yes.');
  if (flags.json) throw new CliArgumentError('--interactive cannot be combined with --json.');
}
