import { describe, expect, it } from 'vitest';
import type { SkillCandidate } from '../../src/core/services/skill-candidates.js';
import { rankSkills } from '../../src/core/services/skill-ranking.js';

function candidate(name: string, description = '', harnesses = 1): SkillCandidate {
  const ids = ['claude-code', 'codex-cli', 'cursor'] as const;
  return { name, description, origins: ids.slice(0, harnesses).map((harness) => ({ harness, folder: '.agents/skills' })) };
}
function names(ranked: readonly SkillCandidate[]): string[] {
  return ranked.map((entry) => entry.name);
}

describe('snapshot ranking (prd-20 FR-03, OBJ-04, TC-03)', () => {
  const pool = [
    candidate('commit', 'Writes a commit; mentions a checkpoint in the history'),
    candidate('sdd-triage', 'Picks a level; saves a checkpoint of the decision'),
    candidate('sdd-snapshot', 'Writes the context file'),
    candidate('handoff-notes'),
    candidate('review', 'Reviews code'),
  ];

  it('puts name matches first, description matches after, and drops the rest', () => {
    expect(names(rankSkills('snapshot', pool))).toEqual(['handoff-notes', 'sdd-snapshot', 'commit', 'sdd-triage']);
  });

  it('never lets a description match beat a name match', () => {
    const ranked = names(rankSkills('snapshot', pool));
    expect(ranked.indexOf('sdd-snapshot')).toBeLessThan(ranked.indexOf('commit'));
    expect(ranked.indexOf('sdd-snapshot')).toBeLessThan(ranked.indexOf('sdd-triage'));
  });

  it('reads only the first 300 characters of the description', () => {
    const late = candidate('notes', `${'x'.repeat(300)} snapshot`);
    expect(rankSkills('snapshot', [late])).toEqual([]);
  });
});

describe('resume ranking (prd-20 FR-04, FR-06, TC-04, TC-06)', () => {
  it('ranks flow and resume names first and excludes the snapshot skill', () => {
    const pool = [candidate('sdd-snapshot', 'continue after a reset'), candidate('sdd-orchestrate-flow'), candidate('continuar-trabalho'), candidate('commit')];
    expect(names(rankSkills('resume', pool, { exclude: 'sdd-snapshot' }))).toEqual(['continuar-trabalho', 'sdd-orchestrate-flow']);
  });

  it('breaks equal scores by the number of harnesses, then by name', () => {
    const pool = [candidate('b-resume', '', 1), candidate('c-resume', '', 2), candidate('a-resume', '', 1)];
    expect(names(rankSkills('resume', pool))).toEqual(['c-resume', 'a-resume', 'b-resume']);
  });

  it('keeps a name match above a skill present in more harnesses with a weaker match', () => {
    const pool = [candidate('notes', 'how to resume work', 3), candidate('resume-work', '', 1)];
    expect(names(rankSkills('resume', pool))).toEqual(['resume-work', 'notes']);
  });

  it('does not mutate its input', () => {
    const pool = [candidate('b-resume'), candidate('a-resume')];
    rankSkills('resume', pool);
    expect(names(pool)).toEqual(['b-resume', 'a-resume']);
  });
});
