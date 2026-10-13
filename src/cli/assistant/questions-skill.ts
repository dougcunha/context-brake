import type { HarnessId } from '../../core/contracts/harness.js';
import { mergeCatalogs, type SkillCandidate } from '../../core/services/skill-candidates.js';
import { rankSkills, type SkillRole } from '../../core/services/skill-ranking.js';
import { askValidated, type Answer } from './ask.js';
import type { PromptPort } from './prompt-port.js';
import { buildOptions, initialValue, NONE_VALUE, optionFor, OTHER_VALUE, pickSpec, type PickOption } from './skill-options.js';
import type { AssistantContext, Validation } from './types.js';
import type { PromptSpec } from './ui-prompt.js';

export type TypedSkill = { readonly spec: PromptSpec; readonly validate: (answer: string) => Validation<string | null> };
export type SkillQuestion = {
  readonly role: SkillRole;
  readonly current: string | undefined;
  readonly exclude?: string | undefined;
  readonly candidates: readonly SkillCandidate[];
  readonly selectedCount: number;
  readonly typed: TypedSkill;
};

function warn(message: string): void {
  process.stderr.write(`WARN: ${message}\n`);
}

export async function loadCandidates(context: AssistantContext, selected: readonly HarnessId[]): Promise<SkillCandidate[]> {
  try {
    const read = await Promise.all(selected.map(async (harness) => ({ harness, catalog: await context.catalog(harness, context.projectRoot) })));
    const warnings = read.flatMap(({ catalog }) => catalog.warnings);
    if (warnings.length > 0) warn(`Some skill folders could not be read (${warnings.join('; ')}); the list may be incomplete.`);
    return mergeCatalogs(read.map(({ harness, catalog }) => ({ harness, skills: catalog.skills })));
  } catch (error: unknown) {
    warn(`Could not read the project skills (${error instanceof Error ? error.message : 'unknown error'}); type the skill name instead.`);
    return [];
  }
}

function pickValidator(options: readonly PickOption[], typed: TypedSkill, initial: string): (answer: string) => Validation<string> {
  return (answer) => {
    if (answer === '') return { value: initial };
    const option = optionFor(options, answer);
    if (option !== null) return { value: option };
    const result = typed.validate(answer);
    return 'error' in result ? result : { value: result.value ?? NONE_VALUE };
  };
}

export async function askSkill(question: SkillQuestion, prompts: PromptPort): Promise<Answer<string | null> | null> {
  const { role, current, typed } = question;
  const ranked = rankSkills(role, question.candidates, { exclude: question.exclude });
  if (ranked.length === 0) return askValidated(prompts, typed.spec, typed.validate);
  const options = buildOptions({ role, ranked, current, selectedCount: question.selectedCount });
  const initial = initialValue(options, current);
  const picked = await askValidated(prompts, pickSpec(role, options, initial), pickValidator(options, typed, initial));
  if (picked === null) return null;
  if (picked.value === OTHER_VALUE) return askValidated(prompts, typed.spec, typed.validate);
  return { value: picked.value === NONE_VALUE ? null : picked.value };
}
