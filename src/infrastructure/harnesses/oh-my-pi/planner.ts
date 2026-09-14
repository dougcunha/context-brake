import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';

export const OMP_EXTENSION_FILE = '.omp/extensions/context-brake.js';

export function buildOmpEntries(): ManagedEntry[] {
  return [
    { harness: 'oh-my-pi', path: OMP_EXTENSION_FILE, identity: `extension|${OMP_EXTENSION_FILE}` },
  ];
}

export async function planOmpInstall(projectRoot: string): Promise<AdapterPlan> {
  const realExt = await resolveChangeTarget(projectRoot, OMP_EXTENSION_FILE);
  const content = await loadRuntimeAsset('omp-extension.js');
  const changes: PlannedChange[] = [
    { path: OMP_EXTENSION_FILE, realPath: realExt, kind: 'create', owner: 'runtime_asset', content, preview: { summary: 'Install Oh-My-Pi extension' } },
  ];
  return { harness: 'oh-my-pi', changes, conflicts: [], entries: buildOmpEntries() };
}

export async function planOmpRemove(projectRoot: string): Promise<AdapterPlan> {
  const realExt = await resolveChangeTarget(projectRoot, OMP_EXTENSION_FILE);
  const changes: PlannedChange[] = [
    { path: OMP_EXTENSION_FILE, realPath: realExt, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete Oh-My-Pi extension' } },
  ];
  return { harness: 'oh-my-pi', changes, conflicts: [], entries: buildOmpEntries() };
}
