import type { RestartReasonCode } from '../contracts/auto-restart.js';

export type StandDownFacts = { readonly disabledByEnv: boolean; readonly interactive: boolean };
export type GuardFacts = { readonly consecutive: number; readonly maxConsecutive: number; readonly toolCallsSinceSeed: number | undefined };
export type RestartFacts = {
  readonly signal: boolean;
  readonly standDown: StandDownFacts;
  readonly guards: GuardFacts;
};
export type RestartDecision = { readonly kind: 'restart' } | { readonly kind: 'skip'; readonly code: RestartReasonCode };

function standDownCode(facts: StandDownFacts): RestartReasonCode | undefined {
  if (facts.disabledByEnv) return 'SKIP_DISABLED_ENV';
  return facts.interactive ? undefined : 'SKIP_NON_INTERACTIVE';
}

function guardCode(guards: GuardFacts): RestartReasonCode | undefined {
  if (guards.consecutive >= guards.maxConsecutive) return 'PAUSED_LOOP_GUARD';
  return guards.consecutive > 0 && guards.toolCallsSinceSeed === 0 ? 'SKIP_NO_PROGRESS' : undefined;
}

export function decideRestart(facts: RestartFacts): RestartDecision {
  if (!facts.signal) return { kind: 'skip', code: 'SKIP_NO_SIGNAL' };
  const code = standDownCode(facts.standDown) ?? guardCode(facts.guards);
  return code === undefined ? { kind: 'restart' } : { kind: 'skip', code };
}
