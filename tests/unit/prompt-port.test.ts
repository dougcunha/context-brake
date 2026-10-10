import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { ClackPromptPort } from '../../src/cli/assistant/clack-prompt-port.js';
import { confirmWithPort, ReadlinePromptPort } from '../../src/cli/assistant/prompt-port.js';
import { createPromptPort, PLAIN_PROMPTS_VARIABLE } from '../../src/cli/assistant/prompt-factory.js';
import { ScriptedPrompts } from '../helpers/scripted-prompts.js';

describe('prompt port (prd-16 NFR-01, NFR-03, TC-04)', () => {
  it('answers from a scripted port and returns null when the script ends (NFR-03, TC-04)', async () => {
    const prompts = new ScriptedPrompts(['y']);
    expect(await confirmWithPort(prompts, 'Apply?')).toBe(true);
    expect(await confirmWithPort(prompts, 'Apply?')).toBe(false);
    expect(prompts.asked).toEqual(['Apply? [y/N] ', 'Apply? [y/N] ']);
  });
  it('confirms the plan through a rich confirm prompt (FR-07, DEC-11)', async () => {
    const prompts = { ask: vi.fn(), askUi: vi.fn(async () => 'y') };
    expect(await confirmWithPort(prompts, 'Apply?')).toBe(true);
    expect(prompts.askUi).toHaveBeenCalledWith({ kind: 'confirm', message: 'Apply?', initial: false }, null);
  });
  it('reads a line through readline and returns null at end of input (NFR-01, TC-04)', async () => {
    const input = new PassThrough();
    const port = new ReadlinePromptPort(input, new PassThrough());
    const first = port.ask('Name? ');
    input.write('claude-code\n');
    expect(await first).toBe('claude-code');
    const second = port.ask('Next? ');
    input.end();
    expect(await second).toBeNull();
    expect(await port.ask('Again? ')).toBeNull();
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
