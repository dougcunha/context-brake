import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { isSkillName, MAX_SKILL_NAME_LENGTH, skillNameProblem } from '../../src/core/contracts/skill-name.js';

const LONGEST = 'a'.repeat(MAX_SKILL_NAME_LENGTH);

describe('skill name rule (prd-19 FR-01, TC-01)', () => {
  it.each([
    'sdd-snapshot', 'commit', 'a', 'a1-b2', 'anthropic-skills:docs', LONGEST, `${LONGEST}:${LONGEST}`,
  ])('accepts %s', (name) => {
    expect(isSkillName(name)).toBe(true);
    expect(skillNameProblem(name)).toBeNull();
  });
  it.each([
    '/sdd-snapshot', '$x', '@x', 'Sdd', 'a b', 'a--b', '-a', 'a-', '', 'a:b:c', 'a::b', ':a', 'a:', `${LONGEST}a`, `${LONGEST}a:b`, 'a_b', 'a.b',
  ])('rejects %j', (name) => {
    expect(isSkillName(name)).toBe(false);
    expect(skillNameProblem(name)).not.toBeNull();
  });
  it('suggests the bare name only when the remainder is a valid name (FR-02)', () => {
    expect(skillNameProblem('/commit')).toBe('"/commit" is not a skill name; use the bare name commit');
    expect(skillNameProblem('/Commit')).toContain('use lowercase letters');
  });
});

describe('published config schema (prd-19 FR-01, NFR-05, TC-01)', () => {
  type NameProperty = { pattern: string; maxLength: number };
  type SnapshotProperties = { properties: { snapshot: { properties: Record<string, NameProperty> } } };

  it.each(['command', 'resumeCommand'])('states the name rule for snapshot.%s', async (key) => {
    const document = JSON.parse(await readFile('schemas/context-brake.config.schema.json', 'utf8')) as SnapshotProperties;
    const { pattern, maxLength } = document.properties.snapshot.properties[key] as NameProperty;
    expect(maxLength).toBe(MAX_SKILL_NAME_LENGTH * 2 + 1);
    for (const name of ['sdd-snapshot', 'anthropic-skills:docs', LONGEST, `${LONGEST}:${LONGEST}`]) expect(new RegExp(pattern).test(name)).toBe(true);
    for (const name of ['/sdd-snapshot', 'Sdd', '', `${LONGEST}a`, `${LONGEST}a:b`]) expect(new RegExp(pattern).test(name)).toBe(false);
  });
});
