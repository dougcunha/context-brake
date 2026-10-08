export const HOOK_PHASES = ['project_root', 'stdin', 'event', 'config', 'input', 'engine', 'ledger', 'prune', 'guidance'] as const;

export type HookPhase = (typeof HOOK_PHASES)[number];
export type PhaseMark = (phase: HookPhase) => void;
export type ExpiryCheck = () => boolean;
export type ClaimDeadline = { readonly isExpired: ExpiryCheck; readonly commit: () => boolean };
export type PhaseTiming = { readonly phase?: HookPhase | undefined; readonly elapsedMs?: number | undefined };
