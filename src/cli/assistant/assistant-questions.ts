import type { PromptPort } from './prompt-port.js';
import { askHarnesses } from './questions-harness.js';
import { askMisc } from './questions-misc.js';
import { askRestart } from './questions-restart.js';
import { askSnapshot } from './questions-snapshot.js';
import type { AssistantContext, AssistantResult } from './types.js';

export async function runQuestions(context: AssistantContext, prompts: PromptPort): Promise<AssistantResult | null> {
  const harness = await askHarnesses(context, prompts);
  if (harness === null) return null;
  const snapshot = await askSnapshot(context, prompts);
  if (snapshot === null) return null;
  const restart = await askRestart(context, { selected: harness.selected, hasSnapshotCommand: snapshot.command !== null }, prompts);
  if (restart === null) return null;
  const misc = await askMisc(context, harness.selected, prompts);
  if (misc === null) return null;
  return {
    flags: [...harness.flags, ...snapshot.flags, ...restart.flags, ...misc.flags],
    facts: {
      selected: harness.selected, excluded: harness.excluded, snapshotCommand: snapshot.command, triggerZone: snapshot.triggerZone,
      resumeCommand: snapshot.resumeCommand, restartOn: restart.on, restartLimit: restart.limit, restartModes: restart.modes,
      statuslineBridge: misc.statuslineBridge, debug: misc.debug, gitIgnore: misc.gitIgnore,
    },
  };
}
