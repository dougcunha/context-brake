import readline from 'node:readline/promises';

export class ConfirmationRequiredError extends Error {
  readonly code = 'CONFIRMATION_REQUIRED' as const;
  readonly exitCode = 2 as const;
  constructor(message = 'Confirmation required for write operations. Use --yes in non-interactive environments.') {
    super(message);
  }
}

export async function authorizeWrite(isYes: boolean, requiresConfirmation: boolean, promptMessage: string): Promise<boolean> {
  if (!requiresConfirmation || isYes) return true;
  if (!process.stdin.isTTY) throw new ConfirmationRequiredError();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${promptMessage} [y/N] `);
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}
