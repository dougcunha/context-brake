import process from 'node:process';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { SessionLauncher } from '../../core/contracts/run-ports.js';
import type { RunnerConfiguration } from '../../core/contracts/runner-configuration.js';
import type { TaskPlan } from '../../core/contracts/task-plan.js';
import { runPlan } from '../../core/services/run-loop.js';
import { listValidationCommands } from '../../core/services/run-preflight.js';
import { buildRunSummary, type RunResult } from '../../core/services/run-summary.js';
import { composeRunDependencies, composeRunSettings, runLockFor } from '../../infrastructure/runner/runner-composition.js';
import { newRunId, nodeHasher } from '../../infrastructure/runner/run-system-ports.js';
import { loadRuntimeConfiguration } from '../../infrastructure/runtime/runtime-composition.js';
import { EXIT_CODES } from '../exit-codes.js';
import { renderJsonOutput } from '../output/json.js';
import { formatDecision, formatSummary, TextRunProgress } from '../output/run-text.js';
import { resolveRunLimits, type ParsedRunArgs } from '../run-arguments.js';
import { InterruptFlag, signalRouter } from '../shutdown.js';
import type { CommandEnv } from './init.js';
import { terminalAsk, TerminalCommandApprover, TerminalStepApprover } from './run-prompts.js';
import { requireLauncher, requireRunnablePlan, RunCommandError } from './run-preflight.js';

export const PERMISSION_NOTICE = '[WARN] context-brake run leaves harness permission modes at their defaults: Claude Code denies tool calls that would prompt, and Codex CLI runs read-only, so the agent may be unable to write. Opt into another mode explicitly with --harness-arg, for example --harness-arg --permission-mode --harness-arg acceptEdits.\n';

type RunInvocation = { readonly args: ParsedRunArgs; readonly env: CommandEnv; readonly config: ContextBrakeConfig; readonly limits: RunnerConfiguration };

export async function runRun(args: ParsedRunArgs, env: CommandEnv): Promise<number> {
  const config = await loadRuntimeConfiguration(env.projectRoot);
  const limits = resolveRunLimits(config.runner, args.overrides);
  const launcher = await requireLauncher(args);
  const readiness = await requireRunnablePlan(env.projectRoot, config);
  if (readiness.kind === 'complete') return report(args, nothingToRun(readiness.plan, args));
  process.stderr.write(PERMISSION_NOTICE);
  const result = await runLocked({ args, env, config, limits }, { launcher, plan: readiness.plan });
  return report(args, result);
}

export function runExitCode(result: Pick<RunResult, 'stopReason' | 'sessions'>): number {
  if (result.stopReason === 'completed') return EXIT_CODES.healthy;
  if (result.stopReason === 'limit_reached') return EXIT_CODES.limitReached;
  if (result.stopReason === 'interrupted') return EXIT_CODES.interrupted;
  if (result.stopReason === 'confirmation_required' && result.sessions.length === 0) return EXIT_CODES.error;
  return EXIT_CODES.decisionRequired;
}

async function runLocked(invocation: RunInvocation, target: { readonly launcher: SessionLauncher; readonly plan: TaskPlan }): Promise<RunResult> {
  const runId = newRunId(new Date());
  const lock = runLockFor(invocation.env.projectRoot);
  const holder = await lock.acquire({ pid: process.pid, runId });
  if (holder !== null) {
    throw new RunCommandError('RUN_IN_PROGRESS', `Another context-brake run (pid ${holder.pid}, run ${holder.runId}) is in progress for this project. Wait for it to finish or stop it; a lock left by a process that no longer exists is replaced automatically.`);
  }
  const interrupt = new InterruptFlag((signal) => process.stderr.write(`[STOP] ${signal} received: stopping the harness session and keeping the plan and checkpoint valid. Wait for the summary.\n`));
  const unregister = signalRouter.register(interrupt);
  try {
    const deps = composeRunDependencies({ projectRoot: invocation.env.projectRoot, config: invocation.config, launcher: target.launcher, cli: cliPorts(invocation.args, target.plan, interrupt) });
    const settings = composeRunSettings({ runId, config: invocation.config, limits: invocation.limits, harnessArgs: invocation.args.harnessArgs });
    return await runPlan({ deps, settings });
  } finally {
    unregister();
    await lock.release();
  }
}

function cliPorts(args: ParsedRunArgs, plan: TaskPlan, interrupt: InterruptFlag): Parameters<typeof composeRunDependencies>[0]['cli'] {
  const interactive = process.stdin.isTTY === true;
  const ask = terminalAsk({ input: process.stdin, output: process.stderr, onInterrupt: () => signalRouter.handle('SIGINT') });
  const prompt = { interactive, ask, output: process.stderr };
  const listed = args.approveCommands ? listValidationCommands(plan, nodeHasher).map((command) => command.hash) : [];
  return {
    commandApprover: new TerminalCommandApprover({ ...prompt, preApprovedHashes: new Set(listed) }),
    stepApprover: args.approveSteps ? new TerminalStepApprover(prompt) : null,
    interrupt,
    progress: new TextRunProgress(process.stderr),
  };
}

function nothingToRun(plan: TaskPlan, args: ParsedRunArgs): RunResult {
  return {
    runId: null, status: 'completed', stopReason: 'completed', limit: null, durationMs: 0, sessions: [],
    tokens: { value: 0, source: 'estimated' }, plan, decisionStepId: null, outputTail: null, harnessArgs: [...args.harnessArgs],
  };
}

function report(args: ParsedRunArgs, result: RunResult): number {
  const exitCode = runExitCode(result);
  const summary = buildRunSummary(result, exitCode);
  const stepTitle = result.plan?.steps.find((step) => step.id === result.decisionStepId)?.title ?? null;
  process.stderr.write(formatDecision(summary, { stepTitle, outputTail: result.outputTail }));
  if (args.json) renderJsonOutput(summary);
  else process.stdout.write(formatSummary(summary));
  return exitCode;
}
