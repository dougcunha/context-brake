import type { HarnessId } from '../../core/contracts/harness.js';
import { askValidated, confirmSpec, yesNo } from './ask.js';
import type { PromptPort } from './prompt-port.js';
import { askGitIgnore } from './questions-gitignore.js';
import type { AssistantContext } from './types.js';

export type MiscChoice = { readonly statuslineBridge: boolean | null; readonly debug: boolean; readonly gitIgnore: boolean | null; readonly flags: readonly string[] };

async function askBridge(context: AssistantContext, prompts: PromptPort): Promise<{ answer: boolean; flags: string[] } | null> {
  const fallback = !context.hasStatuslineOptOut;
  const answer = await askValidated(prompts, confirmSpec('Install the Claude Code status line bridge?', fallback), yesNo(fallback));
  if (answer === null) return null;
  if (answer.value === fallback) return { answer: answer.value, flags: [] };
  return { answer: answer.value, flags: [answer.value ? '--statusline-bridge' : '--no-statusline-bridge'] };
}

export async function askMisc(context: AssistantContext, selected: readonly HarnessId[], prompts: PromptPort): Promise<MiscChoice | null> {
  const bridge = selected.includes('claude-code') ? await askBridge(context, prompts) : { answer: null, flags: [] };
  if (bridge === null) return null;
  const wasDebug = context.config?.debug === true;
  const debug = await askValidated(prompts, confirmSpec('Print context usage to the agent (debug mode)?', wasDebug), yesNo(wasDebug));
  if (debug === null) return null;
  const debugFlags = debug.value === wasDebug ? [] : [debug.value ? '--debug' : '--no-debug'];
  const gitIgnore = await askGitIgnore(context, prompts);
  if (gitIgnore === null) return null;
  return { statuslineBridge: bridge.answer, debug: debug.value, gitIgnore: gitIgnore.answer, flags: [...bridge.flags, ...debugFlags, ...gitIgnore.flags] };
}
