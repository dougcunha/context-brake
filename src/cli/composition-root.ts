import { realpath } from 'node:fs/promises';
import type { ParsedCliArgs } from './argument-parser.js';
import type { CommandEnv } from './commands/init.js';
import { runInit } from './commands/init.js';
import { runDoctor } from './commands/doctor.js';
import { runRemove } from './commands/remove.js';
import { runPlan } from './commands/plan.js';
import { runWrap } from './commands/wrap.js';
import { runRun } from './commands/run.js';
import { CLI_ERROR_CODES } from '../core/contracts/diagnostics.js';
import { buildCliErrorDocument, type BuildCliErrorInput } from '../core/services/report-service.js';
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
    '  context-brake plan init --task="<name>" [options]',
    '  context-brake plan status [options]',
    '  context-brake run --harness <claude-code|codex-cli> [options]',
    '  context-brake wrap -- <command> [args...]', '',

    'Commands:',
    '  init     Detect harnesses, register integrations, and initialize ContextBrake',
    '  doctor   Diagnose integrations, configurations, versions, and overhead',
    '  remove   Remove ContextBrake integrations and managed files',
    '  plan     Create and inspect the task plan and checkpoint',
    '  run      Drive the plan through fresh harness sessions, validating each step before advancing',
    '  wrap     Run a command in a runner session and append its context telemetry', '',
  ].join('\n'));
}

const KNOWN_ERROR_CODES: ReadonlySet<string> = new Set(['INVALID_ARGUMENTS', ...CLI_ERROR_CODES]);

function errorCode(err: unknown): BuildCliErrorInput['code'] {
  if (err instanceof InvalidConfigurationError) return 'INVALID_CONTEXTBRAKE_CONFIG';
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && KNOWN_ERROR_CODES.has(code) ? (code as BuildCliErrorInput['code']) : 'UNEXPECTED_ERROR';
}

function handleCommandError(err: unknown, cmd: BuildCliErrorInput['command'], json: boolean): number {
  const msg = err instanceof Error ? err.message : String(err);
  const doc = buildCliErrorDocument({ command: cmd, code: errorCode(err), message: msg });
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
    if (args.command === 'wrap') return await runWrap(args, canonicalEnv);
    if (args.command === 'run') return await runRun(args, canonicalEnv);
    return 0;
  } catch (err) {
    return handleCommandError(err, args.command, args.json);
  }
}
