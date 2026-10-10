import { describe, expect, it } from 'vitest';
import { runScripted } from '../helpers/assistant-context.js';

const BASE = { detected: ['opencode'], insideGit: true } as const;
const ANSWERS_BEFORE = ['', '', ''];
const QUESTION = "Keep ContextBrake's files out of Git (adds them to .gitignore)?";

describe('assistant git ignore question (prd-17 FR-09, DEC-08, TC-08)', () => {
  it.each([
    { stored: true, answer: '', hint: '[Y/n]', flags: [], gitIgnore: true },
    { stored: true, answer: 'n', hint: '[Y/n]', flags: ['--no-gitignore'], gitIgnore: false },
    { stored: false, answer: '', hint: '[y/N]', flags: [], gitIgnore: false },
    { stored: false, answer: 'y', hint: '[y/N]', flags: ['--gitignore'], gitIgnore: true },
  ])('is asked last and emits $flags for answer "$answer" with stored $stored (FR-09, TC-08)', async ({ stored, answer, hint, flags, gitIgnore }) => {
    const { result, asked } = await runScripted([...ANSWERS_BEFORE, answer], { ...BASE, config: { gitIgnore: stored } });
    expect(asked.at(-1)).toBe(`${QUESTION} ${hint}: `);
    expect(result?.flags).toEqual(['--harness', 'opencode', ...flags]);
    expect(result?.facts.gitIgnore).toBe(gitIgnore);
  });
  it('is not asked outside Git and the fact is not applicable (FR-09, TC-08)', async () => {
    const { result, asked } = await runScripted(ANSWERS_BEFORE, { ...BASE, insideGit: false });
    expect(asked.some((question) => question.includes('.gitignore'))).toBe(false);
    expect(result?.facts.gitIgnore).toBeNull();
  });
});
