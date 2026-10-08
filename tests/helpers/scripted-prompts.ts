import type { PromptPort } from '../../src/cli/assistant/prompt-port.js';

export class ScriptedPrompts implements PromptPort {
  readonly asked: string[] = [];
  private position = 0;

  constructor(private readonly answers: readonly (string | null)[]) {}

  async ask(question: string): Promise<string | null> {
    this.asked.push(question);
    const answer = this.answers[this.position];
    this.position += 1;
    return answer === undefined ? null : answer;
  }
}
