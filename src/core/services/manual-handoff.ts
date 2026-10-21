import type { RestartReasonCode } from '../contracts/auto-restart.js';
import type { SnapshotConfig } from '../contracts/configuration.js';
import type { StandDownFacts } from '../contracts/restart-host.js';
import type { SkillInvocationFormat } from '../contracts/skill-invocation.js';
import { standDownCode } from './auto-restart-policy.js';
import type { RestartMode } from './restart-mode.js';
import { resetAction } from './zone-guidance.js';

export const MANUAL_HANDOFF_FOCUS_LIMIT = 500;
export const HANDOFF_ACCEPTED_LINE = 'ContextBrake: asking the agent to save its state; the session restarts when the reply ends.';
export const HANDOFF_OFF_LINE = 'ContextBrake: /handoff needs automatic restart. Run npx context-brake init --auto-restart and start a new session.';
export const HANDOFF_FAILED_LINE = 'ContextBrake: /handoff failed with an internal error. This session keeps running.';
export const HANDOFF_UNAVAILABLE_LINE = 'ContextBrake: /handoff is not available in this session; automatic restart still works.';
const PROMPT_LEAD = 'ContextBrake: the user typed /handoff to continue this work in a new session. Do this now:';
const LINE_BREAK = /\s*\r?\n\s*/g;

export type ManualHandoffRequest = { readonly snapshot: SnapshotConfig; readonly invoke: SkillInvocationFormat; readonly focus?: string | undefined };
export type ManualHandoffFacts = { readonly mode: RestartMode; readonly standDown: StandDownFacts };
export type ManualHandoffDecision = { readonly kind: 'submit' } | { readonly kind: 'refuse-off' } | { readonly kind: 'refuse'; readonly code: RestartReasonCode };

export function normalizeFocus(raw: string): string | undefined {
  const focus = raw.replace(LINE_BREAK, ' ').trim().slice(0, MANUAL_HANDOFF_FOCUS_LIMIT);
  return focus === '' ? undefined : focus;
}

export function manualHandoffPrompt(request: ManualHandoffRequest): string {
  const prompt = `${PROMPT_LEAD} ${resetAction(request.snapshot, request.invoke)}.`;
  if (request.focus === undefined) return prompt;
  const target = request.snapshot.command === undefined ? 'handoff' : 'snapshot';
  return `${prompt} In the ${target}, stress this focus for the next session: "${request.focus}".`;
}

export function decideManualHandoff(facts: ManualHandoffFacts): ManualHandoffDecision {
  if (facts.mode === 'off') return { kind: 'refuse-off' };
  const code = standDownCode(facts.standDown);
  return code === undefined ? { kind: 'submit' } : { kind: 'refuse', code };
}
