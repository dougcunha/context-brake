import { publishContextReading } from './context-reading.js';
import { registerHandoffCommand, runHandoffCommand } from './handoff-command.js';
import type { HookRegistrar, PromptSubmitEvent, TurnCompleteEvent } from './host.js';
import { onPromptSubmit, onSessionStart, onToolCall, onTurnComplete, onTurnStart } from './hooks.js';
import { HANDOFF_COMMAND_NAME } from './mod-info.js';

export function register(on: HookRegistrar): void {
  on('session.start', async ($, e: unknown, next) => {
    await onSessionStart($);
    await publishContextReading($);
    await registerHandoffCommand($);
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
  on('command.run', { command: HANDOFF_COMMAND_NAME }, async ($, e: unknown) => runHandoffCommand($, e));
}
