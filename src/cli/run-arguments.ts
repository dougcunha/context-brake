import { parseArgs } from 'node:util';
import type { HarnessId } from '../core/contracts/harness.js';
import { runnerConfigurationSchema, type RunnerConfiguration } from '../core/contracts/runner-configuration.js';
import { CliArgumentError, validateHarnessIds } from './argument-validator.js';

export const WRAP_SEPARATOR = '--';
export const WRAP_USAGE = 'Usage: context-brake wrap -- <command> [args...]';
export const HARNESS_ARG_OPTION = '--harness-arg';

export type ParsedWrapArgs = { command: 'wrap'; argv: readonly string[]; json: false };
export type RunLimitOverrides = Partial<RunnerConfiguration>;
export type ParsedRunArgs = {
  command: 'run'; harness: HarnessId; approveCommands: boolean; approveSteps: boolean;
  overrides: RunLimitOverrides; harnessArgs: readonly string[]; json: boolean;
};

const LIMIT_OPTIONS = {
  'max-sessions': 'maxSessions',
  'max-minutes': 'maxTotalMinutes',
  'max-session-minutes': 'maxSessionMinutes',
  'max-tokens': 'maxTotalTokens',
  'validation-timeout': 'validationTimeoutSeconds',
  'max-failures': 'maxConsecutiveFailures',
} as const satisfies Record<string, keyof RunnerConfiguration>;
type LimitOption = keyof typeof LIMIT_OPTIONS;
const LIMIT_NAMES = Object.keys(LIMIT_OPTIONS) as LimitOption[];

export function parseWrap(args: readonly string[]): ParsedWrapArgs {
  if (args[0] !== WRAP_SEPARATOR) {
    throw new CliArgumentError(`wrap takes no options and needs '${WRAP_SEPARATOR}' before the command. ${WRAP_USAGE}`);
  }
  const argv = args.slice(1);
  if (argv.length === 0 || argv[0]?.trim() === '') {
    throw new CliArgumentError(`No command follows '${WRAP_SEPARATOR}'. ${WRAP_USAGE}`);
  }
  return { command: 'wrap', argv, json: false };
}

export function parseRun(args: readonly string[]): ParsedRunArgs {
  const { harnessArgs, rest } = extractHarnessArgs(args);
  const limitOptions = Object.fromEntries(LIMIT_NAMES.map((name) => [name, { type: 'string' as const }]));
  const { values } = parseArgs({
    args: rest,
    options: {
      harness: { type: 'string' }, 'approve-commands': { type: 'boolean', default: false },
      'approve-steps': { type: 'boolean', default: false }, json: { type: 'boolean', default: false }, ...limitOptions,
    },
    strict: true,
  });
  return {
    command: 'run', harness: requireHarness(values.harness), approveCommands: values['approve-commands'] === true,
    approveSteps: values['approve-steps'] === true, overrides: parseOverrides(values), harnessArgs, json: values.json === true,
  };
}

export function resolveRunLimits(base: RunnerConfiguration, overrides: RunLimitOverrides): RunnerConfiguration {
  const result = runnerConfigurationSchema.safeParse({ ...base, ...overrides });
  if (result.success) return result.data;
  const detail = result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ');
  throw new CliArgumentError(`The run limits are inconsistent after applying the options: ${detail}. Adjust --max-session-minutes or --max-minutes.`);
}

function extractHarnessArgs(args: readonly string[]): { readonly harnessArgs: string[]; readonly rest: string[] } {
  const harnessArgs: string[] = [];
  const rest: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] as string;
    if (token.startsWith(`${HARNESS_ARG_OPTION}=`)) harnessArgs.push(token.slice(HARNESS_ARG_OPTION.length + 1));
    else if (token !== HARNESS_ARG_OPTION) rest.push(token);
    else if (index + 1 < args.length) harnessArgs.push(args[(index += 1)] as string);
    else throw new CliArgumentError(`Option '${HARNESS_ARG_OPTION}' needs a value, such as ${HARNESS_ARG_OPTION} --permission-mode.`);
  }
  return { harnessArgs, rest };
}

function requireHarness(value: unknown): HarnessId {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CliArgumentError("Option '--harness' is required for run, for example --harness claude-code or --harness codex-cli.");
  }
  const [harness] = validateHarnessIds([value.trim()]);
  return harness as HarnessId;
}

function parseOverrides(values: Partial<Record<string, unknown>>): RunLimitOverrides {
  const overrides: Partial<Record<keyof RunnerConfiguration, number>> = {};
  for (const name of LIMIT_NAMES) {
    const raw = values[name];
    if (typeof raw !== 'string') continue;
    if (!/^[1-9]\d*$/.test(raw.trim())) throw new CliArgumentError(`Option '--${name}' must be a positive integer, received '${raw}'.`);
    overrides[LIMIT_OPTIONS[name]] = Number(raw.trim());
  }
  return overrides;
}
