import type { FileSnapshot, PlannedChange } from '../contracts/changes.js';

export type StateRemovalInput = {
  removeState?: boolean;
  planSnapshot?: FileSnapshot | undefined;
  checkpointSnapshot?: FileSnapshot | undefined;
};

export function planStateDeletions(input: StateRemovalInput): PlannedChange[] {
  const changes: PlannedChange[] = [];
  if (!input.removeState) return changes;
  for (const snap of [input.planSnapshot, input.checkpointSnapshot]) {
    if (!snap?.exists) continue;
    changes.push({ path: snap.path, realPath: snap.realPath, kind: 'delete', owner: 'config', content: null, preview: { summary: `Delete ${snap.path}` } });
  }
  return changes;
}

export function planRuntimeStateDeletions(removeState: boolean | undefined, snapshots: readonly FileSnapshot[]): PlannedChange[] {
  if (!removeState) return [];
  return snapshots
    .filter((snap) => snap.exists)
    .map((snap) => ({ path: snap.path, realPath: snap.realPath, kind: 'delete' as const, owner: 'runtime_state' as const, content: null, preview: { summary: `Delete ${snap.path}` } }));
}
