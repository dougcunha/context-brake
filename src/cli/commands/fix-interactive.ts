import type { DoctorReport } from '../../core/contracts/diagnostics.js';
import { printNothingWritten } from '../assistant/assistant-session.js';
import { createPromptPort } from '../assistant/prompt-factory.js';
import { confirmWithPort, ReadlinePromptPort, type PromptPort } from '../assistant/prompt-port.js';
import { toDecisions, type FlagPolicy } from '../fix-decisions.js';
import { decideByPrompts } from '../fix-prompts.js';
import { applyPlan, fixReport, planFor, unplannedState } from '../fix-steps.js';
import type { CommandEnv } from '../init-flow.js';
import { formatFixPreview, formatFixResult, formatFixSummary, stdoutStyle } from '../output/fix-text.js';

export type InteractiveFix = { readonly env: CommandEnv; readonly before: DoctorReport; readonly policy: FlagPolicy };

const CONFIRMATION_MESSAGE = 'Apply the plan?';

async function interact(fix: InteractiveFix, prompts: PromptPort): Promise<number> {
  const style = stdoutStyle();
  process.stdout.write(formatFixSummary(fixReport(fix.before, unplannedState(fix.before, 'dry_run')), style));
  const decisions = toDecisions(await decideByPrompts(prompts, fix.before.findings, fix.policy), fix.policy);
  const plan = await planFor(fix.env, decisions);
  process.stdout.write(formatFixPreview(fixReport(fix.before, { ...unplannedState(fix.before, 'dry_run'), plan, skipped: decisions.skipped }), style));
  if (plan.changes.length > 0 && !(await confirmWithPort(prompts, CONFIRMATION_MESSAGE))) {
    printNothingWritten();
    return fix.before.exitCode;
  }
  const final = fixReport(fix.before, await applyPlan(fix.env, plan, decisions));
  process.stdout.write(formatFixResult(final, style));
  return final.exitCode;
}

export async function runInteractiveFix(fix: InteractiveFix): Promise<number> {
  const prompts = fix.env.prompts ?? await createPromptPort();
  prompts.begin?.();
  try {
    return await interact(fix, prompts);
  } finally {
    if (prompts instanceof ReadlinePromptPort) prompts.close();
  }
}
