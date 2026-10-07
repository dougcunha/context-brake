import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { HarnessId } from '../contracts/harness.js';
import type { PhaseMark } from '../contracts/hook-phase.js';
import type { RuntimeDecision, RuntimeDescriptor, RuntimeEvent } from '../contracts/runtime.js';
import type { SessionLedger } from '../contracts/session-ledger.js';
import { resumeText } from './zone-guidance.js';

export type SessionResetOptions = {
  readonly descriptor: RuntimeDescriptor;
  readonly config: ContextBrakeConfig;
  readonly ledger: SessionLedger;
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
  const text = resumeText(options.config.snapshot);
  return text === null ? NEUTRAL : { kind: 'context', block: text };
}
