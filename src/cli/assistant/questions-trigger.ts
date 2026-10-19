import { mergeSnapshot, type SnapshotFlags } from '../../core/services/snapshot-merge.js';
import { askValidated } from './ask.js';
import type { PromptPort } from './prompt-port.js';
import { PERCENTAGE_OPTION, percentageSpec, triggerSpec, type TriggerState } from './snapshot-specs.js';
import type { Validation } from './types.js';

export type TriggerChoice = TriggerState & { readonly flags: readonly string[] };

const PERCENTAGE_RULE = 'Enter a whole number from 1 to 100.';
const INTEGER_PATTERN = /^\d+$/;

type TriggerAnswer = { readonly zone: string; readonly percentage: null } | { readonly zone: null; readonly percentage: number | null };

function checked(candidate: Partial<SnapshotFlags>): string | null {
  const merge = mergeSnapshot(undefined, { ...candidate, clearCommand: false });
  return 'error' in merge ? merge.error : null;
}

function validatePercentage(current: number | null): (answer: string) => Validation<number> {
  return (answer) => {
    if (answer === '' && current !== null) return { value: current };
    if (!INTEGER_PATTERN.test(answer)) return { error: PERCENTAGE_RULE };
    const error = checked({ triggerPercentage: Number(answer) });
    return error === null ? { value: Number(answer) } : { error };
  };
}

function typedPercentage(answer: string): Validation<TriggerAnswer> {
  const result = validatePercentage(null)(answer);
  return 'error' in result ? result : { value: { zone: null, percentage: result.value } };
}

function validateTrigger(current: TriggerState): (answer: string) => Validation<TriggerAnswer> {
  return (answer) => {
    if (answer === '') return { value: current.percentage === null ? { zone: current.zone, percentage: null } : { zone: null, percentage: current.percentage } };
    if (answer.toLowerCase() === PERCENTAGE_OPTION) return { value: { zone: null, percentage: null } };
    if (INTEGER_PATTERN.test(answer)) return typedPercentage(answer);
    const error = checked({ triggerZone: answer });
    return error === null ? { value: { zone: answer, percentage: null } } : { error };
  };
}

function triggerFlags(current: TriggerState, choice: TriggerState): string[] {
  if (choice.percentage !== null) return choice.percentage === current.percentage ? [] : ['--snapshot-trigger-percentage', String(choice.percentage)];
  return choice.zone === current.zone && current.percentage === null ? [] : ['--snapshot-trigger', choice.zone];
}

async function askPercentage(current: TriggerState, prompts: PromptPort): Promise<number | null> {
  const answer = await askValidated(prompts, percentageSpec(current.percentage), validatePercentage(current.percentage));
  return answer === null ? null : answer.value;
}

export async function askTrigger(current: TriggerState, prompts: PromptPort): Promise<TriggerChoice | null> {
  const answer = await askValidated(prompts, triggerSpec(current), validateTrigger(current));
  if (answer === null) return null;
  const { zone } = answer.value;
  if (zone !== null) return { zone, percentage: null, flags: triggerFlags(current, { zone, percentage: null }) };
  const percentage = answer.value.percentage ?? (await askPercentage(current, prompts));
  if (percentage === null) return null;
  return { zone: current.zone, percentage, flags: triggerFlags(current, { zone: current.zone, percentage }) };
}
