import type { RestartReasonCode } from '../contracts/auto-restart.js';
import type { RestartHost } from '../contracts/restart-host.js';
import { renderRestartNotice, seedText } from './auto-restart-notices.js';
import { decideRestart, type RestartFacts } from './auto-restart-policy.js';
import { endsWithResetSignal } from './reset-notice.js';
import { bumpConsecutive, markSeeded, rollbackConsecutive } from './restart-guards.js';
import type { RestartMode } from './restart-mode.js';

export type RestartSettings = { readonly maxConsecutive: number; readonly mode: RestartMode };
export type TurnEnd = { readonly text: string; readonly settings: RestartSettings };

export async function reportRestart(host: Pick<RestartHost, 'log' | 'notify'>, code: RestartReasonCode): Promise<void> {
  try {
    await host.log(code);
    const notice = renderRestartNotice(code);
    if (notice !== undefined) host.notify(notice);
  } catch {
    host.notify(renderRestartNotice('ERROR_INTERNAL') ?? '');
  }
}

async function gatherFacts(host: RestartHost, settings: RestartSettings): Promise<RestartFacts> {
  const guards = await host.guards.read();
  return {
    signal: true,
    standDown: await host.standDown(),
    handoff: { required: settings.mode === 'handoff', writtenAt: await host.handoff.pendingSince(), turnStartedAt: host.turnStartedAt() },
    guards: { consecutive: guards.consecutive, maxConsecutive: settings.maxConsecutive, toolCallsSinceSeed: guards.toolCallsSinceSeed ?? undefined },
  };
}

async function guarded(host: RestartHost, step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch {
    await reportRestart(host, 'ERROR_INTERNAL');
  }
}

export async function handleTurnEnd(host: RestartHost, turn: TurnEnd): Promise<void> {
  if (!endsWithResetSignal(turn.text)) return;
  const decision = decideRestart(await gatherFacts(host, turn.settings));
  if (decision.kind === 'skip') return reportRestart(host, decision.code);
  const seed = seedText(await host.resumeForSeed());
  await bumpConsecutive(host.guards);
  await reportRestart(host, 'RESTARTED');
  host.openSession({
    seed,
    onOpened: () => guarded(host, () => markSeeded(host.guards)),
    onRejected: async () => {
      await guarded(host, () => rollbackConsecutive(host.guards));
      await reportRestart(host, 'ERROR_RESTART_REJECTED');
    },
  });
}
