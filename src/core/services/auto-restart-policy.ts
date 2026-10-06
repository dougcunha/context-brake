import type { RestartReasonCode } from '../contracts/auto-restart.js';

export type RestartGate = 'checkpoint' | 'signal-only';
export type CheckpointState = 'valid' | 'missing' | 'invalid' | 'stale' | 'no-active-step';
export type StandDownFacts = { readonly disabledByEnv: boolean; readonly runnerSession: boolean; readonly interactive: boolean };
export type GuardFacts = { readonly consecutive: number; readonly maxConsecutive: number; readonly toolCallsSinceSeed: number | undefined };
export type RestartFacts = {
  readonly gate: RestartGate;
  readonly signal: boolean;
  readonly standDown: StandDownFacts;
  readonly checkpoint: CheckpointState;
  readonly guards: GuardFacts;
};
export type RestartDecision = { readonly kind: 'restart' } | { readonly kind: 'skip'; readonly code: RestartReasonCode };

const CHECKPOINT_CODES: Readonly<Record<Exclude<CheckpointState, 'valid'>, RestartReasonCode>> = {
  missing: 'SKIP_CHECKPOINT_MISSING',
  invalid: 'SKIP_CHECKPOINT_INVALID',
  stale: 'SKIP_CHECKPOINT_STALE',
  'no-active-step': 'SKIP_NO_ACTIVE_STEP',
};

function standDownCode(facts: StandDownFacts): RestartReasonCode | undefined {
  if (facts.disabledByEnv) return 'SKIP_DISABLED_ENV';
  if (facts.runnerSession) return 'SKIP_RUNNER_SESSION';
  return facts.interactive ? undefined : 'SKIP_NON_INTERACTIVE';
}

function checkpointCode(facts: RestartFacts): RestartReasonCode | undefined {
  if (facts.gate === 'signal-only' || facts.checkpoint === 'valid') return undefined;
  return CHECKPOINT_CODES[facts.checkpoint];
}

function guardCode(guards: GuardFacts): RestartReasonCode | undefined {
  if (guards.consecutive >= guards.maxConsecutive) return 'PAUSED_LOOP_GUARD';
  return guards.consecutive > 0 && guards.toolCallsSinceSeed === 0 ? 'SKIP_NO_PROGRESS' : undefined;
}

export function decideRestart(facts: RestartFacts): RestartDecision {
  if (!facts.signal) return { kind: 'skip', code: 'SKIP_NO_SIGNAL' };
  const code = standDownCode(facts.standDown) ?? checkpointCode(facts) ?? guardCode(facts.guards);
  return code === undefined ? { kind: 'restart' } : { kind: 'skip', code };
}
