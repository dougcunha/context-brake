import { describe, expect, it } from 'vitest';
import { mergeCatalogs } from '../../src/core/services/skill-candidates.js';

function skill(name: string, folder: string, description = ''): { name: string; description: string; folder: string } {
  return { name, description, folder };
}

describe('merge of the catalogs of the selected harnesses (prd-20 FR-06, TC-06)', () => {
  it('deduplicates by name and keeps every origin, sorted by harness', () => {
    const merged = mergeCatalogs([
      { harness: 'codex-cli', skills: [skill('a', '.agents/skills', 'first'), skill('b', '.agents/skills')] },
      { harness: 'claude-code', skills: [skill('a', '.claude/skills', 'second')] },
    ]);
    expect(merged.map((candidate) => candidate.name)).toEqual(['a', 'b']);
    expect(merged[0]?.origins).toEqual([{ harness: 'claude-code', folder: '.claude/skills' }, { harness: 'codex-cli', folder: '.agents/skills' }]);
    expect(merged[0]?.description).toBe('first');
    expect(merged[1]?.origins).toEqual([{ harness: 'codex-cli', folder: '.agents/skills' }]);
  });

  it('returns nothing for empty catalogs', () => {
    expect(mergeCatalogs([{ harness: 'pi', skills: [] }])).toEqual([]);
  });
});
