import { HARNESS_IDS, type HarnessId } from '../../core/contracts/harness.js';
import { askValidated } from './ask.js';
import type { PromptPort } from './prompt-port.js';
import type { AssistantContext, Validation } from './types.js';
import type { PromptSpec, UiOption } from './ui-prompt.js';

export type HarnessSelection = { readonly selected: readonly HarnessId[]; readonly excluded: readonly HarnessId[]; readonly flags: readonly string[] };

function detectedIds(context: AssistantContext): HarnessId[] {
  return context.detections.filter((detection) => detection.state === 'project').map((detection) => detection.harness);
}

function defaultSelection(context: AssistantContext): HarnessId[] {
  const active = context.config?.activeHarnesses ?? [];
  return active.length > 0 ? [...active] : detectedIds(context);
}

function describeHarness(context: AssistantContext, harness: HarnessId, preselected: readonly HarnessId[]): string {
  const level = context.adapters.find((adapter) => adapter.id === harness)?.capabilityProfile().supportLevel ?? 'unknown';
  const detected = detectedIds(context).includes(harness) ? 'detected, ' : '';
  return `  ${HARNESS_IDS.indexOf(harness) + 1}) [${preselected.includes(harness) ? 'x' : ' '}] ${harness} (${detected}${level} support)`;
}

function harnessNumber(harness: HarnessId): string {
  return String(HARNESS_IDS.indexOf(harness) + 1);
}

function uiOption(context: AssistantContext, harness: HarnessId): UiOption {
  const level = context.adapters.find((adapter) => adapter.id === harness)?.capabilityProfile().supportLevel ?? 'unknown';
  const detected = detectedIds(context).includes(harness) ? 'detected, ' : '';
  return { value: harnessNumber(harness), label: harness, hint: `${detected}${level} support` };
}

function harnessSpec(context: AssistantContext, preselected: readonly HarnessId[]): PromptSpec {
  const lines = HARNESS_IDS.map((harness) => describeHarness(context, harness, preselected));
  return {
    line: `Harnesses to configure:\n${lines.join('\n')}\nNumbers separated by spaces, Enter to keep the marked ones, or none: `,
    ui: { kind: 'multiselect', message: 'Harnesses to configure', options: HARNESS_IDS.map((harness) => uiOption(context, harness)), initial: preselected.map(harnessNumber) },
  };
}

function validateNumbers(preselected: readonly HarnessId[]): (answer: string) => Validation<readonly HarnessId[]> {
  return (answer) => {
    if (answer === '') return { value: preselected };
    if (answer.toLowerCase() === 'none') return { value: [] };
    const numbers = answer.split(/[\s,]+/).filter((part) => part !== '').map(Number);
    const isValid = numbers.every((number) => Number.isInteger(number) && number >= 1 && number <= HARNESS_IDS.length);
    if (!isValid) return { error: `Choose numbers from 1 to ${HARNESS_IDS.length}, separated by spaces, or type none.` };
    return { value: HARNESS_IDS.filter((_, index) => numbers.includes(index + 1)) };
  };
}

export async function askHarnesses(context: AssistantContext, prompts: PromptPort): Promise<HarnessSelection | null> {
  const preselected = defaultSelection(context);
  const answer = await askValidated(prompts, harnessSpec(context, preselected), validateNumbers(preselected));
  if (answer === null) return null;
  const selected = answer.value;
  const excluded = detectedIds(context).filter((harness) => !selected.includes(harness));
  const flags = [...selected.flatMap((harness) => ['--harness', harness]), ...excluded.flatMap((harness) => ['--exclude-harness', harness])];
  return { selected, excluded, flags };
}
