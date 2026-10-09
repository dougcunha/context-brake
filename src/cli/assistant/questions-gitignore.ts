import { isGitIgnoreEnabled } from '../../core/services/gitignore-merge.js';
import { askValidated, confirmSpec, yesNo } from './ask.js';
import type { PromptPort } from './prompt-port.js';
import type { AssistantContext } from './types.js';

export type GitIgnoreChoice = { readonly answer: boolean | null; readonly flags: readonly string[] };

const QUESTION = "Keep ContextBrake's files out of Git (adds them to .gitignore)?";

export async function askGitIgnore(context: AssistantContext, prompts: PromptPort): Promise<GitIgnoreChoice | null> {
  if (!context.insideGit) return { answer: null, flags: [] };
  const stored = isGitIgnoreEnabled(context.config);
  const answer = await askValidated(prompts, confirmSpec(QUESTION, stored), yesNo(stored));
  if (answer === null) return null;
  if (answer.value === stored) return { answer: answer.value, flags: [] };
  return { answer: answer.value, flags: [answer.value ? '--gitignore' : '--no-gitignore'] };
}
