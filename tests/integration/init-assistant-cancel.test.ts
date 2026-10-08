import { describe, expect, it } from 'vitest';
import { CONFIRMATION_QUESTION, runAssisted, useProject } from '../helpers/assistant-world.js';
import { snapshotTree } from '../helpers/light-world.js';

const NOTHING_WRITTEN = 'Nothing was written.';
const DEFAULT_ANSWERS = ['', '', '', '', ''];

describe('FR-07 cancelling the assistant writes nothing (prd-16, TC-11)', () => {
  const project = useProject();

  it.each([
    ['the first prompt', [null]],
    ['a middle prompt', ['', '/s', null]],
    ['the confirmation', [...DEFAULT_ANSWERS, null]],
    ['a declined confirmation', [...DEFAULT_ANSWERS, 'n']],
  ])('ending input at %s writes nothing and exits like a declined confirmation (FR-07, TC-11)', async (_name, answers) => {
    const before = await snapshotTree(project());
    const run = await runAssisted(project(), answers);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain(NOTHING_WRITTEN);
    expect(await snapshotTree(project())).toEqual(before);
  });
});

describe('FR-07 one confirmation and dry run (prd-16, TC-11)', () => {
  const project = useProject();

  it('asks the confirmation exactly once after the summary (FR-07, TC-11)', async () => {
    const run = await runAssisted(project(), [...DEFAULT_ANSWERS, 'y']);
    expect(run.asked.filter((question) => question.includes(CONFIRMATION_QUESTION))).toHaveLength(1);
    expect(run.stdout.indexOf('Summary of your choices:')).toBeLessThan(run.stdout.indexOf('Planned changes:'));
    expect(await snapshotTree(project())).toHaveProperty(['context-brake.config.json']);
  });

  it('shows the plan and writes nothing with --dry-run, without asking to confirm (FR-07, TC-11)', async () => {
    const before = await snapshotTree(project());
    const run = await runAssisted(project(), DEFAULT_ANSWERS, ['--dry-run']);
    expect(run.code).toBeLessThanOrEqual(1);
    expect(run.stdout).toContain('Planned changes:');
    expect(run.stdout).not.toContain(NOTHING_WRITTEN);
    expect(run.asked.some((question) => question.includes(CONFIRMATION_QUESTION))).toBe(false);
    expect(await snapshotTree(project())).toEqual(before);
  });
});
