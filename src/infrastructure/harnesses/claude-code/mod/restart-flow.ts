import type { RestartReasonCode } from '../../../../core/contracts/auto-restart.js';
import { endsWithResetSignal } from '../../../../core/services/reset-notice.js';
import { foldToolCalls } from '../../../../core/services/restart-guards.js';
import { handleTurnEnd, reportRestart } from '../../../../core/services/restart-flow.js';
import type { ModHost, TurnCompleteEvent } from './host.js';
import { readModConfig } from './mod-config.js';
import { modGuardStore } from './mod-guards.js';
import { createModRestartHost, modReporter } from './restart-host.js';
import { turnSnapshot } from './turn-state.js';

export function reportSafely($: ModHost, code: RestartReasonCode): Promise<void> {
  return reportRestart(modReporter($), code);
}

export async function handleTurnComplete($: ModHost, event: TurnCompleteEvent): Promise<void> {
  if (event.reason !== 'answer' || event.agentId !== undefined) return;
  await foldToolCalls(modGuardStore($, await $.session.root()), turnSnapshot().toolCalls);
  const text = event.answer ?? '';
  if (!endsWithResetSignal(text)) return;
  const config = await readModConfig($);
  if (config === undefined) return;
  await handleTurnEnd(createModRestartHost($, config), { text, settings: { maxConsecutive: config.maxConsecutive, mode: config.mode } });
}
