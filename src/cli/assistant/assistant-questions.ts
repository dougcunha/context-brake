import { invocationFacts } from './invocation-facts.js';
import type { PromptPort } from './prompt-port.js';
import { askHarnesses } from './questions-harness.js';
import { askMisc } from './questions-misc.js';
import { askRestart } from './questions-restart.js';
import { askSnapshot } from './questions-snapshot.js';
import type { AssistantContext, AssistantResult } from './types.js';

export async function runQuestions(context: AssistantContext, prompts: PromptPort): Promise<AssistantResult | null> {
  const harness = await askHarnesses(context, prompts);
  if (harness === null) return null;
  const snapshot = await askSnapshot(context, harness.selected, prompts);
  if (snapshot === null) return null;
  const restart = await askRestart(context, { selected: harness.selected, hasSnapshotCommand: snapshot.command !== null }, prompts);
  if (restart === null) return null;
  const misc = await askMisc(context, harness.selected, prompts);
  if (misc === null) return null;
  return {
    flags: [...harness.flags, ...snapshot.flags, ...restart.flags, ...misc.flags],
    facts: {
      selected: harness.selected, excluded: harness.excluded, snapshotCommand: snapshot.command, triggerZone: snapshot.triggerZone,
      resumeCommand: snapshot.resumeCommand, invocations: invocationFacts(context.invocations, harness.selected, snapshot), restartOn: restart.on, restartLimit: restart.limit, restartModes: restart.modes,
      statuslineBridge: misc.statuslineBridge, contextSource: misc.contextSource, debug: misc.debug, gitIgnore: misc.gitIgnore,
    },
  };
}
