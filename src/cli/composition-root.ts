import { realpath } from 'node:fs/promises';
import type { ParsedCliArgs } from './argument-parser.js';
import type { CommandEnv } from './commands/init.js';
import { runInit } from './commands/init.js';
import { runDoctor } from './commands/doctor.js';
import { runRemove } from './commands/remove.js';
import { runPlan } from './commands/plan.js';
import { buildCliErrorDocument } from '../core/services/report-service.js';
import { renderJsonOutput } from './output/json.js';
import { renderCliErrorText } from './output/text.js';
import { InvalidConfigurationError } from '../core/validation/configuration-validator.js';

function renderHelp(): void {
  process.stdout.write([
    'ContextBrake: Context telemetry and tool-call safeguards for coding-agent harnesses', '',
    'Usage:',
    '  context-brake init [options]',
    '  context-brake doctor [options]',
    '  context-brake remove [options]',
    '  context-brake plan init --task="<name>" [options]', '',
    'Commands:',
    '  init     Detect harnesses, register integrations, and initialize ContextBrake',
    '  doctor   Diagnose integrations, configurations, versions, and overhead',
    '  remove   Remove ContextBrake integrations and managed files',
    '  plan     Create and inspect the task plan and checkpoint', '',
  ].join('\n'));
}

function handleCommandError(err: unknown, cmd: 'init' | 'remove' | 'doctor' | 'plan', json: boolean): number {
  let code: 'INVALID_ARGUMENTS' | 'INVALID_CONTEXTBRAKE_CONFIG' | 'CONFIRMATION_REQUIRED' | 'UNEXPECTED_ERROR' = 'UNEXPECTED_ERROR';
  const msg = err instanceof Error ? err.message : String(err);
  if ((err as { code?: string })?.code === 'INVALID_ARGUMENTS') code = 'INVALID_ARGUMENTS';
  else if (err instanceof InvalidConfigurationError || (err as { code?: string })?.code === 'INVALID_CONTEXTBRAKE_CONFIG') code = 'INVALID_CONTEXTBRAKE_CONFIG';
  else if ((err as { code?: string })?.code === 'CONFIRMATION_REQUIRED') code = 'CONFIRMATION_REQUIRED';
  const doc = buildCliErrorDocument({ command: cmd, code, message: msg });
  if (json) {
    renderJsonOutput(doc);
  } else {
    renderCliErrorText(doc);
  }
  return doc.exitCode;
}

export async function dispatchCommand(args: ParsedCliArgs, env: CommandEnv): Promise<number> {
  if (args.command === 'help') {
    renderHelp();
    return 0;
  }
  const projectRoot = await realpath(env.projectRoot).catch(() => env.projectRoot);
  const canonicalEnv = { ...env, projectRoot };
  try {
    if (args.command === 'init') return await runInit(args, canonicalEnv);
    if (args.command === 'doctor') return await runDoctor(args, canonicalEnv);
    if (args.command === 'remove') return await runRemove(args, canonicalEnv);
    if (args.command === 'plan') return await runPlan(args, canonicalEnv);
    return 0;
  } catch (err) {
    return handleCommandError(err, args.command, args.json);
  }
}
