import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { COMMANDS_NOT_CONFIRMED, terminalAsk, TerminalCommandApprover, TerminalStepApprover } from '../../src/cli/commands/run-prompts.js';
import type { PlanStep } from '../../src/core/contracts/task-plan.js';

const COMMANDS = [{ stepId: 1, command: 'npm test', hash: 'a' }, { stepId: 2, command: 'npm run lint', hash: 'b' }];
const STEP: PlanStep = { id: 2, title: 'Add parser', description: '', status: 'COMPLETED', validationCommand: 'npm test', artifactsProduced: [] };

function output(): { readonly text: string[]; write(chunk: string): boolean } {
  const text: string[] = [];
  return { text, write: (chunk: string) => text.push(chunk) > 0 };
}

describe('TerminalCommandApprover (DEC-10, RF14, CA-10)', () => {
  it('approves without asking when every listed hash was approved by --approve-commands', async () => {
    const out = output();
    const ask = vi.fn();
    const approver = new TerminalCommandApprover({ interactive: false, ask, output: out, preApprovedHashes: new Set(['a', 'b']) });
    expect(await approver.approve(COMMANDS)).toBe(true);
    expect(out.text.join('')).toContain('  - step 2: npm run lint');
    expect(ask).not.toHaveBeenCalled();
  });

  it('stops without a terminal when a command was not listed at start, such as one changed mid-run', async () => {
    const out = output();
    const approver = new TerminalCommandApprover({ interactive: false, ask: vi.fn(), output: out, preApprovedHashes: new Set(['a']) });
    expect(await approver.approve(COMMANDS)).toBe(false);
    expect(out.text.at(-1)).toBe(COMMANDS_NOT_CONFIRMED);
  });

  it('asks on a terminal and returns the answer', async () => {
    const ask = vi.fn(async () => true);
    const approver = new TerminalCommandApprover({ interactive: true, ask, output: output(), preApprovedHashes: new Set() });
    expect(await approver.approve(COMMANDS)).toBe(true);
    expect(ask).toHaveBeenCalledWith('Approve and run these validation commands? [y/N] ');
  });
});

describe('TerminalStepApprover (DEC-17, RF11, CA-08)', () => {
  it('asks to continue after a validated step on a terminal', async () => {
    const ask = vi.fn(async () => false);
    expect(await new TerminalStepApprover({ interactive: true, ask, output: output() }).approve(STEP)).toBe(false);
    expect(ask).toHaveBeenCalledWith("Step 2 'Add parser' passed validation. Continue? [y/N] ");
  });

  it('stops without a terminal and explains how to continue', async () => {
    const out = output();
    expect(await new TerminalStepApprover({ interactive: false, ask: vi.fn(), output: out }).approve(STEP)).toBe(false);
    expect(out.text.join('')).toContain("[STOP] Step 2 'Add parser' passed validation. --approve-steps needs a terminal");
  });
});

describe('terminalAsk (cli-output confirmations)', () => {
  it.each([['y\n', true], ['YES\n', true], ['n\n', false], ['\n', false]])('reads %j as %s', async (answer, expected) => {
    const input = new PassThrough();
    const ask = terminalAsk({ input, output: new PassThrough(), onInterrupt: vi.fn() });
    const pending = ask('Continue? ');
    input.write(answer);
    expect(await pending).toBe(expected);
  });

  it('answers no and forwards the interrupt when Ctrl+C arrives during a terminal prompt (DEC-12)', async () => {
    const input = Object.assign(new PassThrough(), { isTTY: true });
    const output = Object.assign(new PassThrough(), { isTTY: true, columns: 80 });
    const onInterrupt = vi.fn();
    const pending = terminalAsk({ input, output, onInterrupt })('Continue? ');
    input.write('\u0003');
    expect(await pending).toBe(false);
    expect(onInterrupt).toHaveBeenCalledOnce();
  });
});
