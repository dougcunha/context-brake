import type { SkillCandidate } from './skill-candidates.js';

export type SkillRole = 'snapshot' | 'resume';
export type RankOptions = { readonly exclude?: string | undefined };

const ROLE_TERMS: Readonly<Record<SkillRole, readonly string[]>> = {
  snapshot: ['snapshot', 'handoff', 'checkpoint'],
  resume: ['resume', 'continue', 'retomar', 'retomada', 'continuar', 'orchestrate', 'flow'],
};
const NAME_SCORE = 100;
const DESCRIPTION_SCORE = 10;
const DESCRIPTION_WINDOW = 300;

function mentions(text: string, terms: readonly string[]): boolean {
  const lowered = text.toLowerCase();
  return terms.some((term) => lowered.includes(term));
}

export function scoreSkill(role: SkillRole, candidate: SkillCandidate): number {
  const terms = ROLE_TERMS[role];
  if (mentions(candidate.name, terms)) return NAME_SCORE;
  return mentions(candidate.description.slice(0, DESCRIPTION_WINDOW), terms) ? DESCRIPTION_SCORE : 0;
}

export function rankSkills(role: SkillRole, candidates: readonly SkillCandidate[], options: RankOptions = {}): SkillCandidate[] {
  return candidates
    .filter((candidate) => candidate.name !== options.exclude)
    .map((candidate) => ({ candidate, score: scoreSkill(role, candidate) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.candidate.origins.length - left.candidate.origins.length || left.candidate.name.localeCompare(right.candidate.name))
    .map(({ candidate }) => candidate);
}
