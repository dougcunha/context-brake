import { ClackPromptPort } from './clack-prompt-port.js';
import { ReadlinePromptPort, type PromptPort } from './prompt-port.js';

export const PLAIN_PROMPTS_VARIABLE = 'CONTEXT_BRAKE_PLAIN_PROMPTS';

function wantsPlainPrompts(env: NodeJS.ProcessEnv): boolean {
  return env[PLAIN_PROMPTS_VARIABLE] === '1' || env['TERM'] === 'dumb';
}

export async function createPromptPort(env: NodeJS.ProcessEnv = process.env): Promise<PromptPort> {
  if (wantsPlainPrompts(env)) return new ReadlinePromptPort();
  try {
    return new ClackPromptPort(await import('@clack/prompts'));
  } catch {
    return new ReadlinePromptPort();
  }
}
