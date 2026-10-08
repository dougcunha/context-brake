import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { FileSnapshot, HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { HarnessId } from '../contracts/harness.js';
import type { InstallationManifest } from '../contracts/manifest.js';
import { createRemovalFinding } from './removal-helper.js';

export type AssetProtection = { manifest: InstallationManifest | null; snapshots: readonly FileSnapshot[] };
export type HarnessRemovalInput = {
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  protection?: AssetProtection | undefined;
};
export type HarnessRemovals = {
  changes: PlannedChange[];
  conflicts: PlanConflict[];
  harnesses: HarnessInstallPlan[];
  findings: DiagnosticFinding[];
  conflictedAssetPaths: Set<string>;
  conflictedHarnesses: Set<HarnessId>;
};

function guardModifiedAssets(changes: readonly PlannedChange[], protection: AssetProtection | undefined): { changes: PlannedChange[]; conflicts: PlanConflict[] } {
  const guarded = { changes: [] as PlannedChange[], conflicts: [] as PlanConflict[] };
  for (const change of changes) {
    const asset = protection?.manifest?.assets.find((candidate) => candidate.path === change.path);
    const snapshot = protection?.snapshots.find((candidate) => candidate.path === change.path);
    const isModified = change.kind === 'delete' && change.owner === 'runtime_asset' && asset !== undefined && snapshot?.exists === true && snapshot.sha256 !== asset.sha256;
    if (isModified) guarded.conflicts.push({ path: change.path, code: 'MODIFIED_OWNED_ASSET', detail: 'Asset was modified since installation and will not be removed' });
    else guarded.changes.push(change);
  }
  return guarded;
}

export async function planHarnessRemovals(input: HarnessRemovalInput): Promise<HarnessRemovals> {
  const result: HarnessRemovals = { changes: [], conflicts: [], harnesses: [], findings: [], conflictedAssetPaths: new Set(), conflictedHarnesses: new Set() };
  for (const adapter of input.adapters) {
    const plan = await adapter.planRemove(input.context);
    const guarded = guardModifiedAssets(plan.changes, input.protection);
    const conflicts = [...plan.conflicts, ...guarded.conflicts];
    result.changes.push(...guarded.changes);
    result.conflicts.push(...conflicts);
    if (conflicts.length > 0) {
      result.conflictedHarnesses.add(adapter.id);
      for (const path of plan.assetPaths ?? []) result.conflictedAssetPaths.add(path);
      for (const conflict of conflicts) result.findings.push(createRemovalFinding(conflict, adapter.id));
    }
    const profile = adapter.capabilityProfile();
    result.harnesses.push({ harness: adapter.id, outcome: conflicts.length > 0 ? 'conflict' : 'planned', supportLevel: profile.supportLevel, limitations: [...profile.limitations] });
  }
  return result;
}
