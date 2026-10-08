import type { ModHost, PromptSubmitEvent, TurnCompleteEvent } from './host.js';
import { PERSON_PROMPT_ORIGINS } from './mod-info.js';
import { resetConsecutive } from '../../../../core/services/restart-guards.js';
import { modGuardStore } from './mod-guards.js';
import { recordLoaded } from './mod-log.js';
import { handleTurnComplete, reportSafely } from './restart-flow.js';
import { countToolCall, startTurn } from './turn-state.js';

export async function onSessionStart($: ModHost): Promise<void> {
  try {
    await recordLoaded($);
  } catch {
    await reportSafely($, 'ERROR_INTERNAL');
  }
}

export async function onTurnStart($: ModHost): Promise<void> {
  try {
    startTurn(await $.clock.now());
  } catch {
    await reportSafely($, 'ERROR_INTERNAL');
  }
}

export function onToolCall(): void {
  countToolCall();
}

export async function onTurnComplete($: ModHost, event: TurnCompleteEvent): Promise<void> {
  try {
    await handleTurnComplete($, event);
  } catch {
    await reportSafely($, 'ERROR_INTERNAL');
  }
}

export async function onPromptSubmit($: ModHost, event: PromptSubmitEvent): Promise<void> {
  try {
    const kind = event.origin?.kind;
    if (kind !== undefined && PERSON_PROMPT_ORIGINS.includes(kind)) await resetConsecutive(modGuardStore($, await $.session.root()));
  } catch {
    await reportSafely($, 'ERROR_INTERNAL');
  }
}
