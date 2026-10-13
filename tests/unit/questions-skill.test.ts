import { describe, expect, it } from 'vitest';
import { runScripted } from '../helpers/assistant-context.js';
import { BLANK_ANSWERS, fakeCatalog, skill } from '../helpers/skill-catalog-fake.js';

const MANY = fakeCatalog({ 'claude-code': ['e', 'd', 'c', 'b', 'a'].map((letter) => skill(`${letter}-snapshot`)) });

function answers(...first: readonly string[]): string[] {
  return [...first, ...BLANK_ANSWERS];
}

describe('snapshot skill picker (prd-20 FR-05, US-01, TC-05, TC-13)', () => {
  it('lists the best match first as recommended, at most three alternatives, type another, and none', async () => {
    const { asked } = await runScripted(answers('', ''), { config: null, catalog: MANY });
    const prompt = asked[1] ?? '';
    const order = ['1) a-snapshot (recommended)', '2) b-snapshot', '3) c-snapshot', '4) d-snapshot', '5) type another', '6) none'];
    expect(order.map((entry) => prompt.indexOf(entry))).toEqual([...order].map((entry) => prompt.indexOf(entry)).sort((left, right) => left - right));
    expect(order.every((entry) => prompt.includes(entry))).toBe(true);
    expect(prompt).not.toContain('e-snapshot');
    expect(prompt).toContain('found in .claude/skills');
  });

  it('keeps the recommended skill on Enter and picks another by number', async () => {
    const enter = await runScripted(answers('', ''), { config: null, catalog: MANY });
    expect(enter.result?.facts.snapshotCommand).toBe('a-snapshot');
    const second = await runScripted(answers('', '2'), { config: null, catalog: MANY });
    expect(second.result?.facts.snapshotCommand).toBe('b-snapshot');
    expect(second.result?.flags).toContain('b-snapshot');
  });

});

describe('snapshot skill picker with a configured, typed, or no skill (prd-20 FR-05, TC-05)', () => {
  it('puts a configured skill that is not found first and keeps it on Enter', async () => {
    const config = { snapshot: { triggerZone: 'RED' as const, command: 'old-skill' } };
    const { asked, result } = await runScripted(answers('', ''), { config, catalog: MANY });
    expect(asked[1]).toContain('1) old-skill (current)');
    expect(result?.facts.snapshotCommand).toBe('old-skill');
    expect(result?.flags).not.toContain('--snapshot-command');
  });

  it('opens the typed question for type another and refuses a name with a slash', async () => {
    const { asked, result } = await runScripted(answers('', '5', '/mine', 'mine'), { config: null, catalog: MANY });
    expect(asked[2]).toContain('Snapshot skill name');
    expect(asked[3]).toContain('"/mine" is not a skill name; use the bare name mine');
    expect(result?.facts.snapshotCommand).toBe('mine');
  });

  it('chooses no skill with none and asks no trigger or resume question', async () => {
    const { asked, result } = await runScripted(answers('', '6'), { config: null, catalog: MANY });
    expect(result?.facts.snapshotCommand).toBeNull();
    expect(asked.some((question) => question.includes('Snapshot trigger'))).toBe(false);
  });
});
