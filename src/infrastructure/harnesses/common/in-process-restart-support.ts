import type { HarnessId } from '../../../core/contracts/harness.js';
import { renderRestartNotice } from '../../../core/services/auto-restart-notices.js';
import { recordInProcessLoaded } from './in-process-restart-log.js';
import { readRestartSettings } from './in-process-restart-state.js';
import { textValue } from './runtime-support.js';

export type RestartSessionContext = {
  readonly cwd?: string | undefined;
  readonly sessionManager?: { readonly getSessionId?: () => string } | undefined;
  readonly ui?: { readonly notify?: (message: string, level?: string) => void } | undefined;
};

export function sessionIdOf(context: RestartSessionContext): string {
  return context.sessionManager?.getSessionId?.() ?? 'unknown';
}

export async function recordRestartLoaded(context: RestartSessionContext, harness: HarnessId): Promise<void> {
  const root = textValue(context.cwd);
  if (root !== null && (await readRestartSettings(root)) !== undefined) await recordInProcessLoaded({ root, harness, sessionId: sessionIdOf(context) });
}

export function reportFailures(context: RestartSessionContext, step: () => Promise<void>): Promise<void> {
  return step().catch(() => context.ui?.notify?.(renderRestartNotice('ERROR_INTERNAL') ?? '', 'info'));
}
