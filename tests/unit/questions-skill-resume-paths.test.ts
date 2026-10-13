import { describe, expect, it } from 'vitest';
import { runQuestions } from '../../src/cli/assistant/assistant-questions.js';
import { assistantContext, runScripted } from '../helpers/assistant-context.js';
import { BLANK_ANSWERS, fakeCatalog, skill } from '../helpers/skill-catalog-fake.js';
import { ScriptedUiPrompts } from '../helpers/scripted-ui-prompts.js';

const CATALOG = fakeCatalog({ 'claude-code': [skill('sdd-snapshot'), skill('sdd-orchestrate-flow')] });
const CONFIGURED = { snapshot: { triggerZone: 'RED' as const, command: 'sdd-snapshot', resumeCommand: 'old-flow' } };

function answers(...first: readonly string[]): string[] {
  return [...first, ...BLANK_ANSWERS];
}

describe('resume skill picker paths (prd-20 FR-05, US-04, TC-05)', () => {
  it('offers type another but not none, because only --no-snapshot-command clears the resume skill', async () => {
    const { asked } = await runScripted(answers('', '', '', ''), { config: null, catalog: CATALOG });
    expect(asked[3]).toContain('2) type another');
    expect(asked[3]).not.toContain('none');
  });

  it('refuses the word none at the resume question and explains how to remove the skill', async () => {
    const { asked, result } = await runScripted(answers('', '', '', 'none', ''), { config: null, catalog: CATALOG });
    expect(asked[4]).toContain('to remove it use --no-snapshot-command');
    expect(result?.facts.resumeCommand).toBe('sdd-orchestrate-flow');
  });

  it('keeps a configured resume skill on Enter and lists it first when it is not found', async () => {
    const { asked, result } = await runScripted(answers('', '', '', ''), { config: CONFIGURED, catalog: CATALOG });
    expect(asked[3]).toContain('1) old-flow (current)');
    expect(result?.facts.resumeCommand).toBe('old-flow');
    expect(result?.flags).not.toContain('--resume-command');
  });

  it('opens the typed question for type another and stores the typed resume skill', async () => {
    const { asked, result } = await runScripted(answers('', '', '', '2', 'my-flow'), { config: null, catalog: CATALOG });
    expect(asked[4]).toContain('Resume skill name');
    expect(result?.flags).toEqual(expect.arrayContaining(['--resume-command', 'my-flow']));
  });
});

describe('skill picker on the terminal prompt (prd-20 FR-05, TC-05)', () => {
  it('shows a select with the options as data and returns the chosen value', async () => {
    const prompts = new ScriptedUiPrompts(['', 'sdd-snapshot', 'RED', 'sdd-orchestrate-flow', ...BLANK_ANSWERS]);
    const result = await runQuestions(assistantContext({ config: null, catalog: CATALOG }), prompts);
    const select = prompts.shown[1];
    expect(select?.kind === 'select' ? select.options.map((option) => option.value) : []).toEqual(['sdd-snapshot', '?other', '?none']);
    expect(select?.kind === 'select' ? select.options[0]?.label : '').toBe('sdd-snapshot (recommended)');
    expect(result?.facts.snapshotCommand).toBe('sdd-snapshot');
    expect(result?.facts.resumeCommand).toBe('sdd-orchestrate-flow');
  });
});
