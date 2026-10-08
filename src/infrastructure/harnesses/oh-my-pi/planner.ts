import type { AdapterPlan, HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { mergeRestartPlan, planRestartAsset, planRestartRemoval, type RestartAssetSpec } from '../common/restart-asset-plan.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';

export const OMP_EXTENSION_FILE = '.omp/extensions/context-brake.js';

export function buildOmpEntries(): ManagedEntry[] {
  return [
    { harness: 'oh-my-pi', path: OMP_EXTENSION_FILE, identity: `extension|${OMP_EXTENSION_FILE}` },
  ];
}

export const OMP_RESTART_FILE = '.omp/extensions/context-brake-restart.js';
const RESTART_SPEC: RestartAssetSpec = { harness: 'oh-my-pi', path: OMP_RESTART_FILE, asset: 'omp-restart.js' };

export async function planOmpInstall(context: HarnessContext): Promise<AdapterPlan> {
  return mergeRestartPlan(await planBaseInstall(context.projectRoot), await planRestartAsset(context, RESTART_SPEC));
}

export async function planOmpRemove(context: HarnessContext): Promise<AdapterPlan> {
  return mergeRestartPlan(await planBaseRemove(context.projectRoot), await planRestartRemoval(context, RESTART_SPEC));
}

async function planBaseInstall(projectRoot: string): Promise<AdapterPlan> {
  const realExt = await resolveChangeTarget(projectRoot, OMP_EXTENSION_FILE);
  const content = await loadRuntimeAsset('omp-extension.js');
  const changes: PlannedChange[] = [
    { path: OMP_EXTENSION_FILE, realPath: realExt, kind: 'create', owner: 'runtime_asset', content, preview: { summary: 'Install Oh-My-Pi extension' } },
  ];
  return { harness: 'oh-my-pi', changes, conflicts: [], entries: buildOmpEntries() };
}

async function planBaseRemove(projectRoot: string): Promise<AdapterPlan> {
  const realExt = await resolveChangeTarget(projectRoot, OMP_EXTENSION_FILE);
  const changes: PlannedChange[] = [
    { path: OMP_EXTENSION_FILE, realPath: realExt, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete Oh-My-Pi extension' } },
  ];
  return { harness: 'oh-my-pi', changes, conflicts: [], entries: buildOmpEntries() };
}
