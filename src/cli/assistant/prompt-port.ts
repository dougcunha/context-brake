import readline from 'node:readline/promises';

export interface PromptPort {
  ask(question: string): Promise<string | null>;
}

const YES_ANSWER = /^(y|yes)$/i;

export class ReadlinePromptPort implements PromptPort {
  private readonly lines: readline.Interface;
  private isClosed = false;

  constructor(input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
    this.lines = readline.createInterface({ input, output });
    this.lines.once('close', () => { this.isClosed = true; });
  }

  ask(question: string): Promise<string | null> {
    if (this.isClosed) return Promise.resolve(null);
    return new Promise((resolve) => {
      function onClose(): void { resolve(null); }
      this.lines.once('close', onClose);
      this.lines.question(question).then((answer) => { this.lines.off('close', onClose); resolve(answer); }, () => resolve(null));
    });
  }

  close(): void {
    this.lines.close();
  }
}

export async function confirmWithPort(prompts: PromptPort, message: string): Promise<boolean> {
  const answer = await prompts.ask(`${message} [y/N] `);
  return answer !== null && YES_ANSWER.test(answer.trim());
}
