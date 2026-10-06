import type { RestartReasonCode } from '../../../../core/contracts/auto-restart.js';
import { renderRestartNotice, seedText } from '../../../../core/services/auto-restart-notices.js';
import { decideRestart } from '../../../../core/services/auto-restart-policy.js';
import { endsWithResetSignal } from '../../../../core/services/reset-notice.js';
import type { ModHost, TurnCompleteEvent } from './host.js';
import { readModConfig, type ModConfig } from './mod-config.js';
import { bumpConsecutive, foldToolCalls, markSeeded, rollbackConsecutive } from './mod-guards.js';
import { recordDecision } from './mod-log.js';
import { gatherFacts } from './restart-facts.js';
import { turnSnapshot } from './turn-state.js';

async function report($: ModHost, code: RestartReasonCode): Promise<void> {
  await recordDecision($, code);
  const notice = renderRestartNotice(code);
  if (notice !== undefined) $.ui.log(notice);
}

export async function reportSafely($: ModHost, code: RestartReasonCode): Promise<void> {
  try {
    await report($, code);
  } catch {
    $.ui.log(renderRestartNotice('ERROR_INTERNAL') ?? '');
  }
}

async function submitSeed($: ModHost, config: ModConfig): Promise<void> {
  try {
    await $.prompt.submit({ text: seedText(config.gate) });
  } catch {
    await reportSafely($, 'ERROR_INTERNAL');
  }
}

async function seedAfterClear($: ModHost, config: ModConfig): Promise<void> {
  const seeded = markSeeded($, config.root).then(undefined, () => reportSafely($, 'ERROR_INTERNAL'));
  await Promise.all([seeded, submitSeed($, config)]);
}

async function abandonRestart($: ModHost, config: ModConfig): Promise<void> {
  try {
    await rollbackConsecutive($, config.root);
  } catch {
    await reportSafely($, 'ERROR_INTERNAL');
  }
  await reportSafely($, 'ERROR_CLEAR_REJECTED');
}

function queueClear($: ModHost, config: ModConfig): void {
  $.command.run({ command: 'clear' }).then(() => seedAfterClear($, config), () => abandonRestart($, config));
}

export async function handleTurnComplete($: ModHost, event: TurnCompleteEvent): Promise<void> {
  if (event.reason !== 'answer' || event.agentId !== undefined) return;
  const turn = turnSnapshot();
  await foldToolCalls($, await $.session.root(), turn.toolCalls);
  if (!endsWithResetSignal(event.answer ?? '')) return;
  const config = await readModConfig($);
  if (config === undefined) return;
  const decision = decideRestart(await gatherFacts($, config, turn.startedAt));
  if (decision.kind === 'skip') return report($, decision.code);
  await bumpConsecutive($, config.root);
  await report($, 'RESTARTED');
  queueClear($, config);
}
