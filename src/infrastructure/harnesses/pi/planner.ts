import type { AdapterPlan, HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { mergeRestartPlan, planRestartAsset, planRestartRemoval, type RestartAssetSpec } from '../common/restart-asset-plan.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';

export const PI_EXTENSION_FILE = '.pi/extensions/context-brake.js';

export function buildPiEntries(): ManagedEntry[] {
  return [
    { harness: 'pi', path: PI_EXTENSION_FILE, identity: `extension|${PI_EXTENSION_FILE}` },
  ];
}

export const PI_RESTART_FILE = '.pi/extensions/context-brake-restart.js';
const RESTART_SPEC: RestartAssetSpec = { harness: 'pi', path: PI_RESTART_FILE, asset: 'pi-restart.js' };

export async function planPiInstall(context: HarnessContext): Promise<AdapterPlan> {
  return mergeRestartPlan(await planBaseInstall(context.projectRoot), await planRestartAsset(context, RESTART_SPEC));
}

export async function planPiRemove(context: HarnessContext): Promise<AdapterPlan> {
  return mergeRestartPlan(await planBaseRemove(context.projectRoot), await planRestartRemoval(context, RESTART_SPEC));
}

async function planBaseInstall(projectRoot: string): Promise<AdapterPlan> {
  const realExt = await resolveChangeTarget(projectRoot, PI_EXTENSION_FILE);
  const content = await loadRuntimeAsset('pi-extension.js');
  const changes: PlannedChange[] = [
    { path: PI_EXTENSION_FILE, realPath: realExt, kind: 'create', owner: 'runtime_asset', content, preview: { summary: 'Install Pi extension' } },
  ];
  return { harness: 'pi', changes, conflicts: [], entries: buildPiEntries() };
}

async function planBaseRemove(projectRoot: string): Promise<AdapterPlan> {
  const realExt = await resolveChangeTarget(projectRoot, PI_EXTENSION_FILE);
  const changes: PlannedChange[] = [
    { path: PI_EXTENSION_FILE, realPath: realExt, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete Pi extension' } },
  ];
  return { harness: 'pi', changes, conflicts: [], entries: buildPiEntries() };
}
