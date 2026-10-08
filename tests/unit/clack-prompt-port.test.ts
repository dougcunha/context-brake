import { describe, expect, it, vi } from 'vitest';
import { askValidated, confirmSpec } from '../../src/cli/assistant/ask.js';
import { ClackPromptPort, type Clack } from '../../src/cli/assistant/clack-prompt-port.js';
import { confirmWithPort, ReadlinePromptPort } from '../../src/cli/assistant/prompt-port.js';
import { createPromptPort, PLAIN_PROMPTS_VARIABLE } from '../../src/cli/assistant/prompt-factory.js';
import type { UiPrompt } from '../../src/cli/assistant/ui-prompt.js';

const CANCELLED = Symbol('cancel');

function fakeClack(answers: readonly unknown[]) {
  const queue = [...answers];
  const next = vi.fn(async () => queue.shift());
  const clack = {
    text: next, select: next, confirm: next, multiselect: next,
    isCancel: (value: unknown) => value === CANCELLED,
    intro: vi.fn(), log: { error: vi.fn(), info: vi.fn() },
  };
  return { clack: clack as unknown as Clack, next, log: clack.log, intro: clack.intro };
}

const MULTI: UiPrompt = { kind: 'multiselect', message: 'Harnesses', options: [{ value: '1', label: 'claude-code', hint: 'detected' }, { value: '2', label: 'codex-cli' }], initial: ['1'] };

describe('ClackPromptPort maps the rich prompts to the line answers the questions validate (prd-16 amendment DEC-11)', () => {
  it('returns the chosen numbers joined by spaces, and none when nothing is marked (DEC-11)', async () => {
    const { clack, next } = fakeClack([['1', '2'], []]);
    const port = new ClackPromptPort(clack);
    expect(await port.askUi(MULTI, null)).toBe('1 2');
    expect(await port.askUi(MULTI, null)).toBe('none');
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ initialValues: ['1'], required: false }));
  });
  it('maps confirm to y or n, passes select and text values through (DEC-11)', async () => {
    const { clack } = fakeClack([true, false, 'RED', '/sdd-snapshot']);
    const port = new ClackPromptPort(clack);
    const confirm: UiPrompt = { kind: 'confirm', message: 'Debug?', initial: false };
    expect(await port.askUi(confirm, null)).toBe('y');
    expect(await port.askUi(confirm, null)).toBe('n');
    expect(await port.askUi({ kind: 'select', message: 'Zone', options: [{ value: 'RED', label: 'RED' }], initial: 'RED' }, null)).toBe('RED');
    expect(await port.askUi({ kind: 'text', message: 'Command', placeholder: 'none' }, null)).toBe('/sdd-snapshot');
  });
});

describe('ClackPromptPort cancel and context (prd-16 amendment DEC-11)', () => {
  it('turns Ctrl+C (the cancel symbol) into null for every prompt kind (FR-07, DEC-11)', async () => {
    const { clack } = fakeClack([CANCELLED, CANCELLED, CANCELLED, CANCELLED, CANCELLED]);
    const port = new ClackPromptPort(clack);
    expect(await port.askUi(MULTI, null)).toBeNull();
    expect(await port.askUi({ kind: 'confirm', message: 'Q', initial: true }, null)).toBeNull();
    expect(await port.askUi({ kind: 'select', message: 'Q', options: [], initial: '' }, null)).toBeNull();
    expect(await port.askUi({ kind: 'text', message: 'Q', placeholder: '' }, null)).toBeNull();
    expect(await port.ask('Plain question')).toBeNull();
  });
  it('shows the context lines and the previous error before the prompt, and opens with an intro (DEC-11)', async () => {
    const { clack, log, intro } = fakeClack(['y']);
    const port = new ClackPromptPort(clack);
    port.begin();
    await port.askUi({ kind: 'confirm', message: 'Restart?', initial: false, context: ['claude-code: automatic', 'carrier'] }, 'Answer y or n.');
    expect(intro).toHaveBeenCalledOnce();
    expect(log.error).toHaveBeenCalledWith('Answer y or n.');
    expect(log.info).toHaveBeenCalledWith('claude-code: automatic\ncarrier');
  });
});

describe('askValidated and confirmWithPort use the rich prompt when the port has one (DEC-11)', () => {
  it('re-asks through the rich prompt and passes the rule as the error (FR-04, DEC-11)', async () => {
    const answers = ['maybe', 'y'];
    const errors: (string | null)[] = [];
    const prompts = { ask: vi.fn(), askUi: vi.fn(async (_prompt: UiPrompt, error: string | null) => { errors.push(error); return answers.shift() ?? null; }) };
    const result = await askValidated(prompts, confirmSpec('Debug?', false), (answer) => (answer === 'y' ? { value: true } : { error: 'Answer y or n.' }));
    expect(result).toEqual({ value: true });
    expect(errors).toEqual([null, 'Answer y or n.']);
    expect(prompts.ask).not.toHaveBeenCalled();
  });
  it('confirms the plan through a rich confirm prompt (FR-07, DEC-11)', async () => {
    const prompts = { ask: vi.fn(), askUi: vi.fn(async () => 'y') };
    expect(await confirmWithPort(prompts, 'Apply?')).toBe(true);
    expect(prompts.askUi).toHaveBeenCalledWith({ kind: 'confirm', message: 'Apply?', initial: false }, null);
  });
});

describe('createPromptPort picks the prompt implementation (DEC-11)', () => {
  it('falls back to the line prompts when asked to, or on a dumb terminal (DEC-11)', async () => {
    const forced = await createPromptPort({ [PLAIN_PROMPTS_VARIABLE]: '1' });
    const dumb = await createPromptPort({ TERM: 'dumb' });
    expect(forced).toBeInstanceOf(ReadlinePromptPort);
    expect(dumb).toBeInstanceOf(ReadlinePromptPort);
    (forced as ReadlinePromptPort).close();
    (dumb as ReadlinePromptPort).close();
  });
  it('uses the rich prompts otherwise (DEC-11)', async () => {
    expect(await createPromptPort({})).toBeInstanceOf(ClackPromptPort);
  });
});
