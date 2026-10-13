import { describe, expect, it } from 'vitest';
import { runScripted } from '../helpers/assistant-context.js';
import { BLANK_ANSWERS, fakeCatalog, skill } from '../helpers/skill-catalog-fake.js';

const TWO = { detected: ['claude-code', 'codex-cli'] } as const;
const CATALOG = fakeCatalog({
  'claude-code': [skill('a-snapshot', '', '.claude/skills'), skill('b-snapshot', '', '.claude/skills')],
  'codex-cli': [skill('a-snapshot', '', '.agents/skills')],
});

describe('skill picker across harnesses (prd-20 FR-06, US-02, TC-06, TC-13)', () => {
  it('ranks a skill found in every selected harness first and says where each one lives', async () => {
    const { asked } = await runScripted(['', '', ...BLANK_ANSWERS], { ...TWO, config: null, catalog: CATALOG });
    const prompt = asked[1] ?? '';
    expect(prompt).toContain('1) a-snapshot (recommended) — found in .claude/skills, .agents/skills');
    expect(prompt).toContain('2) b-snapshot — found in claude-code (.claude/skills)');
  });

  it('uses words for the recommendation and the origin, not only symbols', async () => {
    const { asked } = await runScripted(['', '', ...BLANK_ANSWERS], { ...TWO, config: null, catalog: CATALOG });
    expect(asked[1]).toMatch(/recommended/);
    expect(asked[1]).toMatch(/found in/);
  });
});
