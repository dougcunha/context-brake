import { parseArgs } from 'node:util';
import type { HarnessId } from '../core/contracts/harness.js';
import { CliArgumentError, validateHarnessIds } from './argument-validator.js';
import { parseInit, type ParsedInitArgs } from './init-arguments.js';

export { CliArgumentError } from './argument-validator.js';
export type { ParsedInitArgs } from './init-arguments.js';

export type ParsedDoctorArgs = { command: 'doctor'; json: boolean; harness: readonly HarnessId[] };
export type ParsedRemoveArgs = { command: 'remove'; dryRun: boolean; yes: boolean; json: boolean };
export type ParsedHelpArgs = { command: 'help' };
export type ParsedCliArgs = ParsedInitArgs | ParsedDoctorArgs | ParsedRemoveArgs | ParsedHelpArgs;

function parseDoctor(args: readonly string[]): ParsedDoctorArgs {
  const { values } = parseArgs({
    args: [...args],
    options: { json: { type: 'boolean', default: false }, harness: { type: 'string', multiple: true, default: [] } },
    strict: true,
  });
  return { command: 'doctor', json: Boolean(values.json), harness: validateHarnessIds(values.harness as string[]) };
}

function parseRemove(args: readonly string[]): ParsedRemoveArgs {
  const { values } = parseArgs({
    args: [...args],
    options: {
      'dry-run': { type: 'boolean', default: false }, yes: { type: 'boolean', short: 'y', default: false },
      'json': { type: 'boolean', default: false },
    },
    strict: true,
  });
  return {
    command: 'remove', dryRun: Boolean(values['dry-run']), yes: Boolean(values.yes), json: Boolean(values.json),
  };
}

export function parseCliArgs(args: readonly string[]): ParsedCliArgs {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h' || args[0] === 'help') return { command: 'help' };
  const cmd = args[0];
  const rest = args.slice(1);
  try {
    if (cmd === 'init') return parseInit(rest);
    if (cmd === 'doctor') return parseDoctor(rest);
    if (cmd === 'remove') return parseRemove(rest);
    throw new CliArgumentError(`Unknown command '${cmd}'. Allowed commands: init, doctor, remove.`);
  } catch (error) {
    if (error instanceof CliArgumentError) throw error;
    throw new CliArgumentError(error instanceof Error ? error.message : String(error));
  }
}
