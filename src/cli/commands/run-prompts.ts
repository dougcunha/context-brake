import readline from 'node:readline/promises';
import type { CommandApprover, CommandForApproval, StepApprover } from '../../core/contracts/run-ports.js';
import type { PlanStep } from '../../core/contracts/task-plan.js';
import { formatCommandListing, type TextStream } from '../output/run-text.js';

export type Ask = (question: string) => Promise<boolean>;
export type PromptOptions = { readonly interactive: boolean; readonly ask: Ask; readonly output: TextStream };
export type CommandApproverOptions = PromptOptions & { readonly preApprovedHashes: ReadonlySet<string> };
export type TerminalStreams = { readonly input: NodeJS.ReadableStream; readonly output: NodeJS.WritableStream; readonly onInterrupt: () => void };

const YES_ANSWER = /^(y|yes)$/i;

export const COMMANDS_NOT_CONFIRMED = '[STOP] CONFIRMATION_REQUIRED: the validation commands above are not approved and stdin is not a terminal, so none was executed. Review them, then rerun with --approve-commands or confirm them on a terminal.\n';

export function terminalAsk(streams: TerminalStreams): Ask {
  return async function ask(question: string): Promise<boolean> {
    const rl = readline.createInterface({ input: streams.input, output: streams.output });
    const aborted = new AbortController();
    rl.on('SIGINT', () => {
      aborted.abort();
      streams.onInterrupt();
    });
    try {
      return YES_ANSWER.test((await rl.question(question, { signal: aborted.signal })).trim());
    } catch (error) {
      if (aborted.signal.aborted) return false;
      throw error;
    } finally {
      rl.close();
    }
  };
}

export class TerminalCommandApprover implements CommandApprover {
  constructor(private readonly options: CommandApproverOptions) {}

  async approve(commands: readonly CommandForApproval[]): Promise<boolean> {
    const { output, interactive, ask, preApprovedHashes } = this.options;
    output.write(formatCommandListing(commands));
    if (commands.every((command) => preApprovedHashes.has(command.hash))) return true;
    if (!interactive) {
      output.write(COMMANDS_NOT_CONFIRMED);
      return false;
    }
    return ask('Approve and run these validation commands? [y/N] ');
  }
}

export class TerminalStepApprover implements StepApprover {
  constructor(private readonly options: PromptOptions) {}

  async approve(step: PlanStep): Promise<boolean> {
    const { output, interactive, ask } = this.options;
    const label = `Step ${String(step.id)} '${step.title}' passed validation.`;
    if (!interactive) {
      output.write(`[STOP] ${label} --approve-steps needs a terminal to confirm the next step. Rerun context-brake run on a terminal, or without --approve-steps, to continue.\n`);
      return false;
    }
    return ask(`${label} Continue? [y/N] `);
  }
}
