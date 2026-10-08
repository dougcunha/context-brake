import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { HandoffStore } from '../contracts/handoff.js';
import type { HarnessId } from '../contracts/harness.js';
import type { ClaimDeadline, PhaseMark } from '../contracts/hook-phase.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../contracts/runtime.js';
import type { ResetReason, SessionLedger } from '../contracts/session-ledger.js';
import { restartMode } from './restart-mode.js';
import { handoffResumeText, resumeText } from './zone-guidance.js';

export type SessionResetOptions = {
  readonly descriptor: RuntimeDescriptor;
  readonly config: ContextBrakeConfig;
  readonly ledger: SessionLedger;
  readonly handoff?: HandoffStore | undefined;
};

export type ResetHooks = { readonly onPhase?: PhaseMark | undefined; readonly deadline?: ClaimDeadline | undefined };

const NEUTRAL: RuntimeDecision = { kind: 'neutral' };
const COMPACTION_BOOT_HARNESSES: readonly HarnessId[] = ['claude-code', 'codex-cli', 'pi', 'oh-my-pi'];

export async function handleSessionReset(options: SessionResetOptions, event: RuntimeEvent & { kind: 'session_reset' }, hooks: ResetHooks = {}): Promise<RuntimeDecision> {
  hooks.onPhase?.('ledger');
  await options.ledger.appendResetLine(event.session, event.reason);
  hooks.onPhase?.('prune');
  if (event.reason === 'new') await options.ledger.pruneStaleSessions();
  if (!options.descriptor.capabilities.some((entry) => entry.id === 'session_boot' && entry.state === 'supported')) return NEUTRAL;
  if (event.reason === 'compact' && !COMPACTION_BOOT_HARNESSES.includes(options.descriptor.harness)) return NEUTRAL;
  hooks.onPhase?.('guidance');
  const text = resumeText(options.config.snapshot) ?? await claimHandoff(options, event.reason, hooks.deadline);
  return text === null ? NEUTRAL : { kind: 'context', block: text };
}

async function claimHandoff(options: SessionResetOptions, reason: ResetReason, deadline?: ClaimDeadline): Promise<string | null> {
  if (reason === 'compact' || options.handoff === undefined || restartMode(options.config) !== 'handoff') return null;
  const archived = await options.handoff.claim(deadline);
  return archived === null ? null : handoffResumeText(archived);
}
