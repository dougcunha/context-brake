import type { HarnessId } from '../../core/contracts/harness.js';
import { askValidated, yesNo, yesNoHint } from './ask.js';
import type { PromptPort } from './prompt-port.js';
import type { AssistantContext } from './types.js';

export type MiscChoice = { readonly statuslineBridge: boolean | null; readonly debug: boolean; readonly flags: readonly string[] };

async function askBridge(context: AssistantContext, prompts: PromptPort): Promise<{ answer: boolean; flags: string[] } | null> {
  const fallback = !context.hasStatuslineOptOut;
  const answer = await askValidated(prompts, `Install the Claude Code status line bridge? ${yesNoHint(fallback)}: `, yesNo(fallback));
  if (answer === null) return null;
  if (answer.value === fallback) return { answer: answer.value, flags: [] };
  return { answer: answer.value, flags: [answer.value ? '--statusline-bridge' : '--no-statusline-bridge'] };
}

export async function askMisc(context: AssistantContext, selected: readonly HarnessId[], prompts: PromptPort): Promise<MiscChoice | null> {
  const bridge = selected.includes('claude-code') ? await askBridge(context, prompts) : { answer: null, flags: [] };
  if (bridge === null) return null;
  const wasDebug = context.config?.debug === true;
  const debug = await askValidated(prompts, `Print context usage to the agent (debug mode)? ${yesNoHint(wasDebug)}: `, yesNo(wasDebug));
  if (debug === null) return null;
  const debugFlags = debug.value === wasDebug ? [] : [debug.value ? '--debug' : '--no-debug'];
  return { statuslineBridge: bridge.answer, debug: debug.value, flags: [...bridge.flags, ...debugFlags] };
}
