import { guardStateSchema, IDLE_GUARD_STATE, type GuardState, type RestartGuardStore } from '../../../../core/contracts/restart-host.js';
import type { ModHost } from './host.js';

function guardKey(root: string): string {
  return `contextbrake:autorestart:${root}`;
}

export function modGuardStore($: ModHost, root: string): RestartGuardStore {
  return {
    read: async (): Promise<GuardState> => {
      const parsed = guardStateSchema.safeParse(await $.store.get(guardKey(root)));
      return parsed.success ? parsed.data : IDLE_GUARD_STATE;
    },
    write: async (state: GuardState): Promise<void> => { await $.store.set(guardKey(root), state); },
  };
}
