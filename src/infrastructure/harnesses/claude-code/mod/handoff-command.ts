import { z } from 'zod/mini';
import type { RestartReasonCode } from '../../../../core/contracts/auto-restart.js';
import { renderRestartNotice } from '../../../../core/services/auto-restart-notices.js';
import { decideManualHandoff, HANDOFF_ACCEPTED_LINE, HANDOFF_FAILED_LINE, HANDOFF_OFF_LINE, HANDOFF_UNAVAILABLE_LINE, manualHandoffPrompt, normalizeFocus } from '../../../../core/services/manual-handoff.js';
import { resetConsecutive } from '../../../../core/services/restart-guards.js';
import { CLAUDE_SKILL_INVOCATION } from '../skill-invocation.js';
import type { CommandRunResult, CommandSpec, ModHost } from './host.js';
import { readModConfig, type ModConfig } from './mod-config.js';
import { modGuardStore } from './mod-guards.js';
import { HANDOFF_COMMAND_NAME, HANDOFF_SUBMIT_DELAY_MS } from './mod-info.js';
import { recordDecision } from './mod-log.js';
import { standDownFacts } from './restart-facts.js';
import { reportSafely } from './restart-flow.js';

export const HANDOFF_COMMAND: CommandSpec = { name: HANDOFF_COMMAND_NAME, description: 'Save the session state and restart in a new session', argumentHint: '[focus]' };
const commandArgsSchema = z.object({ args: z.optional(z.string()) });

export async function registerHandoffCommand($: ModHost): Promise<void> {
  try {
    await $.command.register(HANDOFF_COMMAND);
  } catch {
    $.ui.log(HANDOFF_UNAVAILABLE_LINE);
  }
}

function focusOf(event: unknown): string | undefined {
  const parsed = commandArgsSchema.safeParse(event);
  return parsed.success && parsed.data.args !== undefined ? normalizeFocus(parsed.data.args) : undefined;
}

function submitPrompt($: ModHost, text: string): void {
  $.prompt.submit({ text }).catch(() => reportSafely($, 'ERROR_INTERNAL'));
}

function submitAfterCommand($: ModHost, text: string): void {
  $.clock.after(HANDOFF_SUBMIT_DELAY_MS, () => { submitPrompt($, text); });
}

async function startHandoff($: ModHost, config: ModConfig, event: unknown): Promise<CommandRunResult> {
  await resetConsecutive(modGuardStore($, config.root));
  submitAfterCommand($, manualHandoffPrompt({ snapshot: config.snapshot, invoke: CLAUDE_SKILL_INVOCATION, focus: focusOf(event) }));
  return { text: HANDOFF_ACCEPTED_LINE };
}

async function refuse($: ModHost, code: RestartReasonCode): Promise<CommandRunResult> {
  await recordDecision($, code);
  return { text: renderRestartNotice(code) ?? HANDOFF_FAILED_LINE };
}

async function handoff($: ModHost, event: unknown): Promise<CommandRunResult> {
  const config = await readModConfig($);
  const decision = decideManualHandoff({ mode: config?.mode ?? 'off', standDown: await standDownFacts($) });
  if (decision.kind === 'refuse') return refuse($, decision.code);
  if (decision.kind === 'refuse-off' || config === undefined) return { text: HANDOFF_OFF_LINE };
  return startHandoff($, config, event);
}

function failed($: ModHost): Promise<CommandRunResult> {
  const answer = { text: HANDOFF_FAILED_LINE };
  return recordDecision($, 'ERROR_INTERNAL').then(() => answer, () => answer);
}

export async function runHandoffCommand($: ModHost, event: unknown): Promise<CommandRunResult> {
  try {
    return await handoff($, event);
  } catch {
    return failed($);
  }
}
