import type { RestartReasonCode } from '../contracts/auto-restart.js';
import type { StandDownFacts } from '../contracts/restart-host.js';

export type { StandDownFacts } from '../contracts/restart-host.js';
export type GuardFacts = { readonly consecutive: number; readonly maxConsecutive: number; readonly toolCallsSinceSeed: number | undefined };
export type HandoffFacts = { readonly required: boolean; readonly writtenAt: number | null; readonly turnStartedAt: number | undefined };
export type RestartFacts = {
  readonly signal: boolean;
  readonly standDown: StandDownFacts;
  readonly handoff: HandoffFacts;
  readonly guards: GuardFacts;
};
export type RestartDecision = { readonly kind: 'restart' } | { readonly kind: 'skip'; readonly code: RestartReasonCode };

function standDownCode(facts: StandDownFacts): RestartReasonCode | undefined {
  if (facts.disabledByEnv) return 'SKIP_DISABLED_ENV';
  return facts.interactive ? undefined : 'SKIP_NON_INTERACTIVE';
}

function handoffCode(handoff: HandoffFacts): RestartReasonCode | undefined {
  if (!handoff.required) return undefined;
  if (handoff.writtenAt === null) return 'SKIP_HANDOFF_MISSING';
  return handoff.turnStartedAt === undefined || handoff.writtenAt < handoff.turnStartedAt ? 'SKIP_HANDOFF_STALE' : undefined;
}

function guardCode(guards: GuardFacts): RestartReasonCode | undefined {
  if (guards.consecutive >= guards.maxConsecutive) return 'PAUSED_LOOP_GUARD';
  return guards.consecutive > 0 && guards.toolCallsSinceSeed === 0 ? 'SKIP_NO_PROGRESS' : undefined;
}

export function decideRestart(facts: RestartFacts): RestartDecision {
  if (!facts.signal) return { kind: 'skip', code: 'SKIP_NO_SIGNAL' };
  const code = standDownCode(facts.standDown) ?? handoffCode(facts.handoff) ?? guardCode(facts.guards);
  return code === undefined ? { kind: 'restart' } : { kind: 'skip', code };
}
