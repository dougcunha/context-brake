import { DEFAULT_MAX_CONSECUTIVE_RESTARTS, MAX_CONSECUTIVE_RESTARTS, MIN_CONSECUTIVE_RESTARTS } from '../../core/contracts/auto-restart.js';
import type { HarnessId } from '../../core/contracts/harness.js';
import { harnessRestartMode } from '../../core/services/restart-install-extras.js';
import { askValidated, confirmSpec, yesNo } from './ask.js';
import type { PromptPort } from './prompt-port.js';
import type { AssistantContext, HarnessRestartFact, Validation } from './types.js';
import type { PromptSpec } from './ui-prompt.js';

export type RestartChoice = { readonly asked: boolean; readonly on: boolean; readonly limit: number | null; readonly modes: readonly HarnessRestartFact[]; readonly flags: readonly string[] };
export type RestartInput = { readonly selected: readonly HarnessId[]; readonly hasSnapshotCommand: boolean };

const LIMIT_RULE = `The restart limit must be an integer from ${MIN_CONSECUTIVE_RESTARTS} to ${MAX_CONSECUTIVE_RESTARTS}.`;
const SNAPSHOT_CARRIER = 'The reset resumes through your snapshot command.';
const HANDOFF_CARRIER = 'With no snapshot command, the agent writes a markdown handoff (.context-brake/handoff.md) and the next session resumes from it.';

function describeModes(context: AssistantContext, selected: readonly HarnessId[]): { facts: HarnessRestartFact[]; lines: string[] } {
  const facts: HarnessRestartFact[] = [];
  const lines: string[] = [];
  for (const adapter of context.adapters.filter((candidate) => selected.includes(candidate.id))) {
    const { mode, reason } = harnessRestartMode(adapter.capabilityProfile());
    facts.push({ harness: adapter.id, mode });
    lines.push(`  ${adapter.id}: ${mode}${mode === 'not available' ? '' : ` - ${reason}`}`);
  }
  return { facts, lines };
}

function limitSpec(current: number): PromptSpec {
  const values = Array.from({ length: MAX_CONSECUTIVE_RESTARTS - MIN_CONSECUTIVE_RESTARTS + 1 }, (_, index) => String(MIN_CONSECUTIVE_RESTARTS + index));
  return {
    line: `Consecutive-restart limit ${MIN_CONSECUTIVE_RESTARTS}-${MAX_CONSECUTIVE_RESTARTS} [${current}]: `,
    ui: { kind: 'select', message: 'Consecutive restarts allowed without a prompt from you', options: values.map((value) => ({ value, label: value })), initial: String(current) },
  };
}

function validateLimit(current: number): (answer: string) => Validation<number> {
  return (answer) => {
    if (answer === '') return { value: current };
    const value = /^\d+$/.test(answer) ? Number(answer) : Number.NaN;
    return value >= MIN_CONSECUTIVE_RESTARTS && value <= MAX_CONSECUTIVE_RESTARTS ? { value } : { error: LIMIT_RULE };
  };
}

export async function askRestart(context: AssistantContext, input: RestartInput, prompts: PromptPort): Promise<RestartChoice | null> {
  const stored = context.config?.autoRestart;
  const wasOn = stored !== undefined;
  const { facts, lines } = describeModes(context, input.selected);
  if (!facts.some((fact) => fact.mode !== 'not available')) return { asked: false, on: wasOn, limit: stored?.maxConsecutiveRestarts ?? null, modes: facts, flags: [] };
  const carrier = input.hasSnapshotCommand ? SNAPSHOT_CARRIER : HANDOFF_CARRIER;
  const spec = confirmSpec('Restart sessions automatically?', wasOn, ['Restart behavior of the selected harnesses:', ...lines, carrier]);
  const on = await askValidated(prompts, spec, yesNo(wasOn));
  if (on === null) return null;
  if (!on.value) return { asked: true, on: false, limit: null, modes: facts, flags: wasOn ? ['--no-auto-restart'] : [] };
  const current = stored?.maxConsecutiveRestarts ?? DEFAULT_MAX_CONSECUTIVE_RESTARTS;
  const limit = await askValidated(prompts, limitSpec(current), validateLimit(current));
  if (limit === null) return null;
  const flags = [...(wasOn ? [] : ['--auto-restart']), ...(limit.value === current ? [] : ['--max-restarts', String(limit.value)])];
  return { asked: true, on: true, limit: limit.value, modes: facts, flags };
}
