import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AdapterPlan, HarnessContext } from '../../../core/contracts/adapter.js';
import type { HarnessId } from '../../../core/contracts/harness.js';
import { resolveChangeTarget } from './change-target.js';
import { pathExists } from './path-helpers.js';
import { loadRuntimeAsset } from './runtime-assets.js';

export type RestartAssetSpec = { readonly harness: HarnessId; readonly path: string; readonly asset: string };
type RestartAssetPlan = Pick<AdapterPlan, 'changes' | 'conflicts' | 'entries'>;

const EMPTY: RestartAssetPlan = { changes: [], conflicts: [], entries: [] };

async function isModified(context: HarnessContext, path: string): Promise<boolean> {
  const recorded = context.manifest?.assets.find((asset) => asset.path === path);
  if (recorded === undefined) return false;
  const current = createHash('sha256').update(await readFile(resolve(context.projectRoot, path))).digest('hex');
  return current !== recorded.sha256;
}

async function installPlan(context: HarnessContext, spec: RestartAssetSpec): Promise<RestartAssetPlan> {
  const realPath = await resolveChangeTarget(context.projectRoot, spec.path);
  const content = await loadRuntimeAsset(spec.asset);
  return {
    changes: [{ path: spec.path, realPath, kind: 'create', owner: 'runtime_asset', content, preview: { summary: 'Install the automatic restart module' } }],
    conflicts: [],
    entries: [{ harness: spec.harness, path: spec.path, identity: `extension|${spec.path}` }],
  };
}

export async function planRestartRemoval(context: HarnessContext, spec: RestartAssetSpec): Promise<RestartAssetPlan> {
  if (!(await pathExists(resolve(context.projectRoot, spec.path)))) return EMPTY;
  if (await isModified(context, spec.path)) return { ...EMPTY, conflicts: [{ path: spec.path, code: 'MODIFIED_OWNED_ASSET', detail: 'Asset was modified since installation and will not be removed' }] };
  const realPath = await resolveChangeTarget(context.projectRoot, spec.path);
  return { ...EMPTY, changes: [{ path: spec.path, realPath, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete the automatic restart module' } }] };
}

export function planRestartAsset(context: HarnessContext, spec: RestartAssetSpec): Promise<RestartAssetPlan> {
  return context.autoRestart === true ? installPlan(context, spec) : planRestartRemoval(context, spec);
}

export function mergeRestartPlan(base: AdapterPlan, restart: RestartAssetPlan): AdapterPlan {
  return { ...base, changes: [...base.changes, ...restart.changes], conflicts: [...base.conflicts, ...restart.conflicts], entries: [...base.entries, ...restart.entries] };
}
