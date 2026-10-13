import { parseInit, type ParsedInitArgs } from '../init-arguments.js';
import { loadInitConfigState } from '../init-config-state.js';
import { detectStyle } from '../output/style.js';
import { buildAssistantContext, type AssistantEnv } from './assistant-context.js';
import { runQuestions } from './assistant-questions.js';
import { formatEquivalentCommand } from './equivalent-command.js';
import type { PromptPort } from './prompt-port.js';
import { renderSummary } from './summary.js';

const NOTHING_WRITTEN = 'Nothing was written.';
const DRY_RUN_FLAG = '--dry-run';

export function printNothingWritten(): void {
  process.stdout.write(`${NOTHING_WRITTEN}\n`);
}

async function askForFlags(env: AssistantEnv, prompts: PromptPort): Promise<readonly string[] | null> {
  const state = await loadInitConfigState(env.projectRoot, { include: [], exclude: [] });
  const result = await runQuestions(await buildAssistantContext(env, state), prompts);
  if (result === null) return null;
  const style = detectStyle({ env: process.env, platform: process.platform, isTty: process.stdout.isTTY === true });
  process.stdout.write(`${renderSummary(result.facts, formatEquivalentCommand(result.flags), style).join('\n')}\n`);
  return result.flags;
}

export async function resolveAssistedArgs(args: ParsedInitArgs, env: AssistantEnv, prompts: PromptPort): Promise<ParsedInitArgs | null> {
  const flags = await askForFlags(env, prompts);
  if (flags === null) return null;
  return parseInit([...flags, ...(args.dryRun ? [DRY_RUN_FLAG] : [])]);
}
