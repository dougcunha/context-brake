import type { PromptPort } from '../../src/cli/assistant/prompt-port.js';
import type { UiPrompt } from '../../src/cli/assistant/ui-prompt.js';

export class ScriptedUiPrompts implements PromptPort {
  readonly shown: UiPrompt[] = [];
  private position = 0;

  constructor(private readonly answers: readonly (string | null)[]) {}

  ask(question: string): Promise<string | null> {
    return Promise.reject(new Error(`a line prompt was used instead of askUi: ${question}`));
  }

  askUi(prompt: UiPrompt): Promise<string | null> {
    this.shown.push(prompt);
    const answer = this.answers[this.position];
    this.position += 1;
    return Promise.resolve(answer === undefined ? null : answer);
  }
}
