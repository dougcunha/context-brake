export const HOOK_PHASES = ['project_root', 'stdin', 'event', 'config', 'input', 'engine', 'ledger', 'prune', 'guidance', 'boot_files', 'boot_git'] as const;

export type HookPhase = (typeof HOOK_PHASES)[number];
export type PhaseMark = (phase: HookPhase) => void;
export type PhaseTiming = { readonly phase?: HookPhase | undefined; readonly elapsedMs?: number | undefined };
