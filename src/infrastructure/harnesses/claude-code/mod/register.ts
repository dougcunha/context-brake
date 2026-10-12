import { publishContextReading } from './context-reading.js';
import type { HookRegistrar, PromptSubmitEvent, TurnCompleteEvent } from './host.js';
import { onPromptSubmit, onSessionStart, onToolCall, onTurnComplete, onTurnStart } from './hooks.js';

export function register(on: HookRegistrar): void {
  on('session.start', async ($, e: unknown, next) => {
    await onSessionStart($);
    await publishContextReading($);
    return next(e);
  });
  on('turn.start', async ($, e: unknown, next) => {
    await onTurnStart($);
    await publishContextReading($);
    return next(e);
  });
  on('tool.call', async ($, e: unknown, next) => {
    onToolCall();
    await publishContextReading($);
    return next(e);
  });
  on('turn.complete', async ($, e: TurnCompleteEvent, next) => {
    await publishContextReading($);
    await onTurnComplete($, e);
    return next(e);
  });
  on('prompt.submit', async ($, e: PromptSubmitEvent, next) => {
    await onPromptSubmit($, e);
    return next(e);
  });
}
