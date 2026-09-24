import type { HarnessId } from '../../core/contracts/harness.js';
import type { SessionLauncher } from '../../core/contracts/run-ports.js';
import { ClaudeSessionLauncher } from '../harnesses/claude-code/session-launcher.js';
import { CodexSessionLauncher } from '../harnesses/codex-cli/session-launcher.js';

export type LauncherResolution =
  | { readonly supported: true; readonly launcher: SessionLauncher }
  | { readonly supported: false; readonly reason: string };

const NO_HOOKS_IN_NON_INTERACTIVE = 'documents a non-interactive mode, but not whether project hooks or plugins run in it, so the brake, the boot, and the critical stop cannot be guaranteed';

export const UNSUPPORTED_RUN_REASONS: Readonly<Record<Exclude<HarnessId, 'claude-code' | 'codex-cli'>, string>> = {
  'github-copilot-cli': `GitHub Copilot CLI ${NO_HOOKS_IN_NON_INTERACTIVE}`,
  'cursor': `Cursor ${NO_HOOKS_IN_NON_INTERACTIVE}`,
  'opencode': `OpenCode ${NO_HOOKS_IN_NON_INTERACTIVE}`,
  'pi': 'Pi skips project extensions in non-interactive mode under the default project trust, so the ContextBrake extension does not load',
  'oh-my-pi': 'Oh-My-Pi documents no non-interactive mode',
  'antigravity-cli': 'Antigravity CLI documents no non-interactive mode',
};

export function sessionLauncherFor(harness: HarnessId): LauncherResolution {
  if (harness === 'claude-code') return { supported: true, launcher: new ClaudeSessionLauncher() };
  if (harness === 'codex-cli') return { supported: true, launcher: new CodexSessionLauncher() };
  return { supported: false, reason: UNSUPPORTED_RUN_REASONS[harness] };
}
