import type { PromptPort } from './prompt-port.js';
import type { Validation } from './types.js';

export type Answer<T> = { readonly value: T };

export async function askValidated<T>(prompts: PromptPort, question: string, validate: (answer: string) => Validation<T>): Promise<Answer<T> | null> {
  let prefix = '';
  while (true) {
    const answer = await prompts.ask(`${prefix}${question}`);
    if (answer === null) return null;
    const result = validate(answer.trim());
    if ('value' in result) return result;
    prefix = `${result.error}\n`;
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
