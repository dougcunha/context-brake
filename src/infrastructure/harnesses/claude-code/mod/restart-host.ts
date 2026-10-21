import { HANDOFF_RELATIVE_PATH, type HandoffReader } from '../../../../core/contracts/handoff.js';
import type { OpenSessionRequest, RestartHost } from '../../../../core/contracts/restart-host.js';
import { reportRestart } from '../../../../core/services/restart-flow.js';
import type { ModHost } from './host.js';
import type { ModConfig } from './mod-config.js';
import { modGuardStore } from './mod-guards.js';
import { recordDecision } from './mod-log.js';
import { standDownFacts } from './restart-facts.js';
import { waitForSessionSwitch } from './session-switch.js';
import { turnSnapshot } from './turn-state.js';

type ModReporter = Pick<RestartHost, 'log' | 'notify'>;

export function modReporter($: ModHost): ModReporter {
  return { log: (code) => recordDecision($, code), notify: (text) => $.ui.log(text) };
}

function modHandoff($: ModHost, root: string): HandoffReader {
  const path = `${root}/${HANDOFF_RELATIVE_PATH}`;
  return { pendingSince: async () => ((await $.fs.exists(path)) ? (await $.fs.stat(path)).mtimeMs : null) };
}

async function submitSeed($: ModHost, seed: string): Promise<void> {
  try {
    await $.prompt.submit({ text: seed });
  } catch {
    await reportRestart(modReporter($), 'ERROR_INTERNAL');
  }
}

async function seedAfterSwitch($: ModHost, endedId: string | undefined, request: OpenSessionRequest): Promise<void> {
  await waitForSessionSwitch($, endedId);
  await Promise.all([request.onOpened(), submitSeed($, request.seed)]);
}

async function clearAndSeed($: ModHost, request: OpenSessionRequest): Promise<void> {
  const endedId = await $.session.id().then((id) => id, () => undefined);
  await $.command.run({ command: 'clear' }).then(() => seedAfterSwitch($, endedId, request), () => request.onRejected());
}

function openAfterClear($: ModHost, request: OpenSessionRequest): void {
  clearAndSeed($, request).catch(() => request.onRejected());
}

export function createModRestartHost($: ModHost, config: ModConfig): RestartHost {
  return {
    ...modReporter($),
    guards: modGuardStore($, config.root),
    handoff: modHandoff($, config.root),
    standDown: () => standDownFacts($),
    turnStartedAt: () => turnSnapshot().startedAt,
    resumeForSeed: async () => null,
    openSession: (request) => openAfterClear($, request),
  };
}
