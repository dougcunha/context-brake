import type { PromptPort } from './prompt-port.js';
import type { UiOption, UiPrompt } from './ui-prompt.js';

export type Clack = typeof import('@clack/prompts');
type Kind<K extends UiPrompt['kind']> = Extract<UiPrompt, { kind: K }>;

const INTRO_TITLE = 'ContextBrake setup';
const NONE_WORD = 'none';

function clackOption(option: UiOption): { value: string; label: string; hint?: string } {
  return option.hint === undefined ? { value: option.value, label: option.label } : { value: option.value, label: option.label, hint: option.hint };
}

export class ClackPromptPort implements PromptPort {
  constructor(private readonly clack: Clack) {}

  begin(): void {
    this.clack.intro(INTRO_TITLE);
  }

  async ask(question: string): Promise<string | null> {
    return this.settle(await this.clack.text({ message: question }));
  }

  async askUi(prompt: UiPrompt, error: string | null): Promise<string | null> {
    if (error !== null) this.clack.log.error(error);
    if (prompt.context !== undefined && prompt.context.length > 0) this.clack.log.info(prompt.context.join('\n'));
    return this.settle(await this.run(prompt));
  }

  private settle(value: string | symbol): string | null {
    return typeof value === 'symbol' || this.clack.isCancel(value) ? null : value;
  }

  private async run(prompt: UiPrompt): Promise<string | symbol> {
    switch (prompt.kind) {
      case 'multiselect': return this.multiselect(prompt);
      case 'select': return this.clack.select({ message: prompt.message, options: prompt.options.map(clackOption), initialValue: prompt.initial });
      case 'confirm': return this.confirm(prompt);
      case 'text': return this.clack.text({ message: prompt.message, placeholder: prompt.placeholder });
    }
  }

  private async multiselect(prompt: Kind<'multiselect'>): Promise<string | symbol> {
    const chosen = await this.clack.multiselect({ message: prompt.message, options: prompt.options.map(clackOption), initialValues: [...prompt.initial], required: false });
    if (typeof chosen === 'symbol') return chosen;
    return chosen.length === 0 ? NONE_WORD : chosen.join(' ');
  }

  private async confirm(prompt: Kind<'confirm'>): Promise<string | symbol> {
    const answer = await this.clack.confirm({ message: prompt.message, initialValue: prompt.initial });
    if (typeof answer === 'symbol') return answer;
    return answer ? 'y' : 'n';
  }
}
