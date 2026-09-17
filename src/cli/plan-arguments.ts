import { parseArgs } from 'node:util';
import { CliArgumentError } from './argument-validator.js';

export const PLAN_SUBCOMMANDS = ['init'] as const;
export type PlanSubcommand = (typeof PLAN_SUBCOMMANDS)[number];

export type ParsedPlanInitArgs = {
  command: 'plan';
  subcommand: 'init';
  task: string;
  yes: boolean;
  json: boolean;
};
export type ParsedPlanArgs = ParsedPlanInitArgs;

function requireTaskName(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CliArgumentError("Option '--task' is required for plan init and must not be empty.");
  }
  return value.trim();
}

function parsePlanInit(args: readonly string[]): ParsedPlanInitArgs {
  const { values } = parseArgs({
    args: [...args],
    options: {
      task: { type: 'string' },
      yes: { type: 'boolean', short: 'y', default: false },
      json: { type: 'boolean', default: false },
    },
    strict: true,
  });
  return {
    command: 'plan', subcommand: 'init', task: requireTaskName(values.task),
    yes: Boolean(values.yes), json: Boolean(values.json),
  };
}

export function parsePlan(args: readonly string[]): ParsedPlanArgs {
  const subcommand = args[0];
  if (subcommand === undefined) {
    throw new CliArgumentError(`Missing plan subcommand. Allowed subcommands: ${PLAN_SUBCOMMANDS.join(', ')}.`);
  }
  if (subcommand !== 'init') {
    throw new CliArgumentError(`Unknown plan subcommand '${subcommand}'. Allowed subcommands: ${PLAN_SUBCOMMANDS.join(', ')}.`);
  }
  return parsePlanInit(args.slice(1));
}
