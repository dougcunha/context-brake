import { resolveAssistedArgs, printNothingWritten } from '../assistant/assistant-session.js';
import { createPromptPort } from '../assistant/prompt-factory.js';
import { ReadlinePromptPort } from '../assistant/prompt-port.js';
import { executeInit, type CommandEnv } from '../init-flow.js';
import type { ParsedInitArgs } from '../init-arguments.js';
import { assertTerminalForAssistant, detectTerminal, shouldRunAssistant } from '../terminal.js';

export type { CommandEnv } from '../init-flow.js';

async function runAssisted(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const prompts = env.prompts ?? await createPromptPort();
  prompts.begin?.();
  try {
    const assisted = await resolveAssistedArgs(args, env, prompts);
    if (assisted === null) {
      printNothingWritten();
      return 0;
    }
    return await executeInit(assisted, env, prompts);
  } finally {
    if (prompts instanceof ReadlinePromptPort) prompts.close();
  }
}

export async function runInit(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const terminal = env.terminal ?? detectTerminal();
  assertTerminalForAssistant(args, terminal);
  return shouldRunAssistant(args, terminal) ? runAssisted(args, env) : executeInit(args, env, null);
}
