import { describe, expect, it } from 'vitest';
import { runScripted } from '../helpers/assistant-context.js';

const BASE = { detected: ['opencode'], insideGit: true } as const;
const ANSWERS_BEFORE = ['', '', ''];

describe('assistant git ignore question (prd-17 FR-09, DEC-08, TC-08)', () => {
  it('is asked last, preselected on, and emits no flag when kept (FR-09, TC-08)', async () => {
    const { result, asked } = await runScripted([...ANSWERS_BEFORE, ''], BASE);
    expect(asked.at(-1)).toContain("Keep ContextBrake's files out of Git (adds them to .gitignore)? [Y/n]");
    expect(result?.flags).not.toContain('--no-gitignore');
    expect(result?.facts.gitIgnore).toBe(true);
  });
  it('emits --no-gitignore only when the person turns it off (FR-09, TC-08)', async () => {
    const { result } = await runScripted([...ANSWERS_BEFORE, 'n'], BASE);
    expect(result?.flags).toContain('--no-gitignore');
    expect(result?.facts.gitIgnore).toBe(false);
  });
  it('defaults to the stored opt-out and emits --gitignore when it is turned back on (FR-09, TC-08)', async () => {
    const stored = { ...BASE, config: { gitIgnore: false } };
    const kept = await runScripted([...ANSWERS_BEFORE, ''], stored);
    expect(kept.asked.at(-1)).toContain('[y/N]');
    expect(kept.result?.flags).not.toContain('--gitignore');
    const back = await runScripted([...ANSWERS_BEFORE, 'y'], stored);
    expect(back.result?.flags).toContain('--gitignore');
  });
  it('is not asked outside Git and the fact is not applicable (FR-09, TC-08)', async () => {
    const { result, asked } = await runScripted(ANSWERS_BEFORE, { ...BASE, insideGit: false });
    expect(asked.some((question) => question.includes('.gitignore'))).toBe(false);
    expect(result?.facts.gitIgnore).toBeNull();
  });
  it('returns null when the person cancels at the question (FR-07, TC-08)', async () => {
    expect((await runScripted([...ANSWERS_BEFORE, null], BASE)).result).toBeNull();
  });
});
