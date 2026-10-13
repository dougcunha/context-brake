import type { SkillCandidate } from '../../core/services/skill-candidates.js';
import type { SkillRole } from '../../core/services/skill-ranking.js';
import type { PromptSpec } from './ui-prompt.js';

export const OTHER_VALUE = '?other';
export const NONE_VALUE = '?none';
const PICK_COUNT = 4;
const TITLES: Readonly<Record<SkillRole, string>> = { snapshot: 'Snapshot skill', resume: 'Resume skill' };

export type PickOption = { readonly value: string; readonly label: string; readonly hint: string };
export type OptionsInput = { readonly role: SkillRole; readonly ranked: readonly SkillCandidate[]; readonly current: string | undefined; readonly selectedCount: number };

function foundIn(candidate: SkillCandidate, selectedCount: number): string {
  if (candidate.origins.length >= selectedCount) return `found in ${[...new Set(candidate.origins.map((origin) => origin.folder))].join(', ')}`;
  return `found in ${candidate.origins.map((origin) => `${origin.harness} (${origin.folder})`).join(', ')}`;
}

function pickOption(candidate: SkillCandidate, index: number, input: OptionsInput): PickOption {
  const tags = [...(index === 0 ? ['recommended'] : []), ...(candidate.name === input.current ? ['current'] : [])];
  return { value: candidate.name, label: tags.length === 0 ? candidate.name : `${candidate.name} (${tags.join(', ')})`, hint: foundIn(candidate, input.selectedCount) };
}

export function buildOptions(input: OptionsInput): PickOption[] {
  const picks = input.ranked.slice(0, PICK_COUNT);
  const options = picks.map((candidate, index) => pickOption(candidate, index, input));
  const { current } = input;
  if (current !== undefined && !picks.some((candidate) => candidate.name === current)) {
    options.unshift({ value: current, label: `${current} (current)`, hint: 'configured, not found in the project skill folders' });
  }
  const none = input.role === 'snapshot' ? [{ value: NONE_VALUE, label: 'none', hint: 'no snapshot skill' }] : [];
  return [...options, { value: OTHER_VALUE, label: 'type another', hint: 'enter a skill name' }, ...none];
}

export function initialValue(options: readonly PickOption[], current: string | undefined): string {
  return current ?? options[0]?.value ?? NONE_VALUE;
}

export function optionFor(options: readonly PickOption[], answer: string): string | null {
  const named = options.find((option) => option.value === answer);
  if (named !== undefined) return named.value;
  const number = Number(answer);
  return Number.isInteger(number) && number >= 1 && number <= options.length ? options[number - 1]?.value ?? null : null;
}

export function pickSpec(role: SkillRole, options: readonly PickOption[], initial: string): PromptSpec {
  const lines = options.map((option, index) => `  ${String(index + 1)}) ${option.label} — ${option.hint}`);
  return {
    line: `${TITLES[role]}:\n${lines.join('\n')}\nNumber or skill name (Enter keeps [${initial}]): `,
    ui: { kind: 'select', message: TITLES[role], options: options.map((option) => ({ value: option.value, label: option.label, hint: option.hint })), initial },
  };
}
