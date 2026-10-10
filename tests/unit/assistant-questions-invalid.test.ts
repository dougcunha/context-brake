import { describe, expect, it } from 'vitest';
import { formatEquivalentCommand } from '../../src/cli/assistant/equivalent-command.js';
import { parseInit } from '../../src/cli/init-arguments.js';
import { runScripted } from '../helpers/assistant-context.js';

const BOTH = { detected: ['claude-code', 'codex-cli'] } as const;
const BOTH_FLAGS = ['--harness', 'claude-code', '--harness', 'codex-cli'];
const LONG_COMMAND = 'x'.repeat(201);
const LIMIT_REASK = 'The restart limit must be an integer from 1 to 10.\nConsecutive-restart limit 1-10 [2]: ';

describe('assistant questions: invalid answers are re-asked with the rule (prd-16 FR-04, TC-07)', () => {
  it.each([['9'], ['0'], ['1.5'], ['1 9']])('re-asks the harness list for %j (FR-04, TC-07)', async (bad) => {
    const { asked, result } = await runScripted([bad, '', '', '', '', '', ''], { detected: ['claude-code'] });
    expect(asked[1]).toMatch(/^Choose numbers from 1 to 8/);
    expect(asked[1]).toContain('Harnesses to configure');
    expect(result?.flags).toEqual(['--harness', 'claude-code']);
  });
  it.each([[LONG_COMMAND], ['line one\nline two']])('re-asks the snapshot command for %j (FR-04, TC-07)', async (bad) => {
    const { asked, result } = await runScripted(['', bad, '/ok', '', '', 'n', 'n', 'n']);
    expect(asked[2]).toMatch(/^Invalid snapshot option: snapshot\.command/);
    expect(result?.flags).toContain('/ok');
  });
  it('re-asks the trigger and a resume command that breaks a rule (FR-04, TC-07)', async () => {
    const { asked, result } = await runScripted(['', '/s', 'BLUE', 'RED', 'two\nlines', '/r', 'n', 'n', 'n']);
    expect(asked[3]).toMatch(/^Invalid snapshot option: snapshot\.triggerZone/);
    expect(asked[5]).toMatch(/^Invalid snapshot option: snapshot\.resumeCommand/);
    expect(result?.flags).toContain('/r');
  });
  it.each([['0', '1'], ['11', '10'], ['2.5', '5']])('re-asks the restart limit for %j and accepts %j (FR-04, TC-07)', async (bad, accepted) => {
    const { asked, result } = await runScripted(['', '', 'y', bad, accepted, 'n', 'n'], BOTH);
    expect(asked[4]).toBe(LIMIT_REASK);
    expect(result?.flags).toEqual([...BOTH_FLAGS, '--auto-restart', '--max-restarts', accepted, '--no-statusline-bridge']);
  });
});

describe('assistant questions: values that start with a dash stay replayable (prd-16 FR-06, TC-07, codereview_01 CR-01)', () => {
  it('joins the value to its flag so parseInit and the printed command accept it (FR-06, TC-07, CR-01)', async () => {
    const { result } = await runScripted(['', '-x', '', '-y', 'n', '', '']);
    expect(result?.flags).toEqual(['--harness', 'claude-code', '--snapshot-command=-x', '--resume-command=-y']);
    expect(parseInit(result?.flags ?? []).snapshot).toMatchObject({ command: '-x', resumeCommand: '-y' });
    expect(formatEquivalentCommand(result?.flags ?? [])).toEqual(['context-brake init --harness claude-code --snapshot-command=-x --resume-command=-y']);
  });
});

describe('assistant questions: unclear answers and cancel (prd-16 FR-04, FR-07, TC-07)', () => {
  it('re-asks a yes or no question for an unclear answer (FR-04, TC-07)', async () => {
    const { asked } = await runScripted(['', '', 'maybe', 'n', 'n']);
    expect(asked.some((question) => question.startsWith('Answer y or n.'))).toBe(true);
  });
  it('returns null and no flags when the person cancels at any question (FR-07, TC-07, TC-08)', async () => {
    const answers = ['', '/s', '', '', 'y', '3', '', '', ''];
    for (let cancelAt = 0; cancelAt < answers.length; cancelAt += 1) {
      const scripted = answers.map((answer, index) => (index === cancelAt ? null : answer));
      expect((await runScripted(scripted, { ...BOTH, insideGit: true })).result).toBeNull();
    }
  });
});
