import type { FixReport } from '../../core/contracts/fix-report.js';
import { ConfirmationRequiredError } from '../confirmation.js';
import { diagnoseDoctor } from '../doctor-diagnosis.js';
import type { ParsedFixArgs } from '../fix-arguments.js';
import { decideByFlags, toDecisions, type FlagPolicy } from '../fix-decisions.js';
import { applyPlan, configSkips, fixReport, hasUnreadableConfig, planFor, stopOf, unplannedState } from '../fix-steps.js';
import type { CommandEnv } from '../init-flow.js';
import { renderJsonOutput } from '../output/json.js';
import { renderFixText } from '../output/fix-text.js';
import { detectTerminal } from '../terminal.js';
import { runInteractiveFix } from './fix-interactive.js';

function output(args: ParsedFixArgs, value: FixReport): number {
  if (args.json) {
    renderJsonOutput(value);
  } else {
    renderFixText(value);
  }
  return value.exitCode;
}

function isInteractive(args: ParsedFixArgs, env: CommandEnv): boolean {
  const terminal = env.terminal ?? detectTerminal();
  return terminal.stdinIsTty && terminal.stdoutIsTty && !args.yes && !args.dryRun && !args.json;
}

export async function runFix(args: ParsedFixArgs, env: CommandEnv): Promise<number> {
  const mode = args.dryRun ? 'dry_run' : 'applied';
  const first = await diagnoseDoctor(env, []);
  const before = first.report;
  const stopped = stopOf(first);
  if (stopped !== null) return output(args, fixReport(before, { ...unplannedState(before, mode), stopped }));
  if (hasUnreadableConfig(before)) return output(args, fixReport(before, { ...unplannedState(before, mode), skipped: configSkips(before) }));
  const policy: FlagPolicy = { force: args.force, harness: args.harness };
  if (isInteractive(args, env)) return runInteractiveFix({ env, before, policy });
  const decisions = toDecisions(decideByFlags(before.findings, policy), policy);
  const plan = await planFor(env, decisions);
  if (args.dryRun) return output(args, fixReport(before, { ...unplannedState(before, mode), plan, skipped: decisions.skipped }));
  if (!args.yes && plan.changes.length > 0) throw new ConfirmationRequiredError();
  return output(args, fixReport(before, await applyPlan(env, plan, decisions)));
}
