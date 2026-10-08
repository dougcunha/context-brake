import type { PromptPort } from './prompt-port.js';
import type { Validation } from './types.js';
import type { PromptSpec } from './ui-prompt.js';

export type Answer<T> = { readonly value: T };

async function askOnce(prompts: PromptPort, spec: PromptSpec, error: string | null): Promise<string | null> {
  if (prompts.askUi !== undefined && spec.ui !== undefined) return prompts.askUi(spec.ui, error);
  return prompts.ask(`${error === null ? '' : `${error}\n`}${spec.line}`);
}

export async function askValidated<T>(prompts: PromptPort, spec: string | PromptSpec, validate: (answer: string) => Validation<T>): Promise<Answer<T> | null> {
  const prompt = typeof spec === 'string' ? { line: spec } : spec;
  let error: string | null = null;
  while (true) {
    const answer = await askOnce(prompts, prompt, error);
    if (answer === null) return null;
    const result = validate(answer.trim());
    if ('value' in result) return result;
    error = result.error;
  }
}

export function yesNo(fallback: boolean): (answer: string) => Validation<boolean> {
  return (answer) => {
    if (answer === '') return { value: fallback };
    if (/^(y|yes)$/i.test(answer)) return { value: true };
    if (/^(n|no)$/i.test(answer)) return { value: false };
    return { error: 'Answer y or n.' };
  };
}

export function yesNoHint(fallback: boolean): string {
  return fallback ? '[Y/n]' : '[y/N]';
}

export function confirmSpec(message: string, fallback: boolean, context: readonly string[] = []): PromptSpec {
  const lead = context.length === 0 ? '' : `${context.join('\n')}\n`;
  return { line: `${lead}${message} ${yesNoHint(fallback)}: `, ui: { kind: 'confirm', message, initial: fallback, context } };
}
