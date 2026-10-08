import { IDLE_GUARD_STATE, type RestartGuardStore } from '../contracts/restart-host.js';

export async function bumpConsecutive(store: RestartGuardStore): Promise<void> {
  const state = await store.read();
  await store.write({ ...state, consecutive: state.consecutive + 1 });
}

export async function rollbackConsecutive(store: RestartGuardStore): Promise<void> {
  const state = await store.read();
  await store.write({ ...state, consecutive: Math.max(0, state.consecutive - 1) });
}

export async function markSeeded(store: RestartGuardStore): Promise<void> {
  const state = await store.read();
  await store.write({ ...state, toolCallsSinceSeed: 0 });
}

export async function foldToolCalls(store: RestartGuardStore, calls: number): Promise<void> {
  const state = await store.read();
  if (state.toolCallsSinceSeed === null || calls === 0) return;
  await store.write({ ...state, toolCallsSinceSeed: state.toolCallsSinceSeed + calls });
}

export async function resetConsecutive(store: RestartGuardStore): Promise<void> {
  const state = await store.read();
  if (state.consecutive === 0 && state.toolCallsSinceSeed === null) return;
  await store.write(IDLE_GUARD_STATE);
}
