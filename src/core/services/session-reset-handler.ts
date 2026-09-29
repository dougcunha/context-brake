import type { PlanPresence } from '../contracts/checkpoint-mode.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { HarnessId } from '../contracts/harness.js';
import type { PhaseMark } from '../contracts/hook-phase.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../contracts/runtime.js';
import type { RuntimeErrorLog, SessionLedger } from '../contracts/session-ledger.js';
import type { BootDecision } from './boot-policy.js';
import { resolveGuidance } from './zone-guidance.js';

export type BootReader = (onPhase?: PhaseMark) => Promise<BootDecision>;
export type SessionResetOptions = {
  readonly descriptor: RuntimeDescriptor;
  readonly config: ContextBrakeConfig;
  readonly ledger: SessionLedger;
  readonly readValidationCommand: () => Promise<string | null>;
  readonly readBoot?: BootReader | undefined;
  readonly errors?: RuntimeErrorLog | undefined;
  readonly planPresence?: PlanPresence | undefined;
};

const NEUTRAL: RuntimeDecision = { kind: 'neutral' };
const COMPACTION_BOOT_HARNESSES: readonly HarnessId[] = ['claude-code', 'codex-cli', 'pi', 'oh-my-pi'];

export async function handleSessionReset(options: SessionResetOptions, event: RuntimeEvent & { kind: 'session_reset' }, onPhase?: PhaseMark): Promise<RuntimeDecision> {
  onPhase?.('ledger');
  await options.ledger.appendResetLine(event.session, event.reason);
  onPhase?.('prune');
  if (event.reason === 'new') await options.ledger.pruneStaleSessions();
  if (!options.descriptor.capabilities.some((entry) => entry.id === 'session_boot' && entry.state === 'supported')) return NEUTRAL;
  if (event.reason === 'compact' && !COMPACTION_BOOT_HARNESSES.includes(options.descriptor.harness)) return NEUTRAL;
  onPhase?.('guidance');
  const guidance = await resolveGuidance({ config: options.config, planPresence: options.planPresence, readValidationCommand: options.readValidationCommand });
  if (guidance.mode !== 'plan') return guidance.resumeText === null ? NEUTRAL : { kind: 'context', block: guidance.resumeText };
  if (!options.readBoot) return NEUTRAL;
  try {
    const decision = await options.readBoot(onPhase);
    return decision.kind === 'boot' || decision.kind === 'invalid_state' ? { kind: 'context', block: decision.text } : NEUTRAL;
  } catch (error) {
    if (options.errors) await options.errors.append(options.descriptor.harness, { event: 'session_reset', code: 'UNEXPECTED', detail: error instanceof Error ? error.message : String(error) }).catch(() => undefined);
    return NEUTRAL;
  }
}
