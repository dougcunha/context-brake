import { describe, expect, it, vi } from 'vitest';
import { askValidated, confirmSpec } from '../../src/cli/assistant/ask.js';
import { ClackPromptPort, type Clack } from '../../src/cli/assistant/clack-prompt-port.js';
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
  it('maps confirm to y or n, passes select and text values through, and logs nothing without an error or context (DEC-11)', async () => {
    const { clack, log } = fakeClack([true, false, 'RED', '/sdd-snapshot']);
    const port = new ClackPromptPort(clack);
    const confirm: UiPrompt = { kind: 'confirm', message: 'Debug?', initial: false, context: [] };
    expect(await port.askUi(confirm, null)).toBe('y');
    expect(await port.askUi(confirm, null)).toBe('n');
    expect(await port.askUi({ kind: 'select', message: 'Zone', options: [{ value: 'RED', label: 'RED' }], initial: 'RED' }, null)).toBe('RED');
    expect(await port.askUi({ kind: 'text', message: 'Command', placeholder: 'none' }, null)).toBe('/sdd-snapshot');
    expect(log.error).not.toHaveBeenCalled();
    expect(log.info).not.toHaveBeenCalled();
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

describe('askValidated uses the rich prompt when the port has one (DEC-11)', () => {
  it('re-asks through the rich prompt and passes the rule as the error (FR-04, DEC-11)', async () => {
    const answers = ['maybe', 'y'];
    const errors: (string | null)[] = [];
    const prompts = { ask: vi.fn(), askUi: vi.fn(async (_prompt: UiPrompt, error: string | null) => { errors.push(error); return answers.shift() ?? null; }) };
    const result = await askValidated(prompts, confirmSpec('Debug?', false), (answer) => (answer === 'y' ? { value: true } : { error: 'Answer y or n.' }));
    expect(result).toEqual({ value: true });
    expect(errors).toEqual([null, 'Answer y or n.']);
    expect(prompts.ask).not.toHaveBeenCalled();
  });
});
