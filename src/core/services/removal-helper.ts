import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { HarnessId } from '../contracts/harness.js';
import type { InstallationManifest } from '../contracts/manifest.js';

export function planRuntimeStateDeletions(snapshots: readonly FileSnapshot[]): PlannedChange[] {
  return snapshots
    .filter((snap) => snap.exists)
    .map((snap) => ({ path: snap.path, realPath: snap.realPath, kind: 'delete' as const, owner: 'runtime_state' as const, content: null, preview: { summary: `Delete ${snap.path}` } }));
}

export function planAssetDeletions(
  manifest: InstallationManifest | null,
  snapshots: readonly FileSnapshot[],
  excludedPaths?: ReadonlySet<string>,
): { changes: PlannedChange[]; conflicts: PlanConflict[] } {
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  if (!manifest) return { changes, conflicts };
  for (const asset of manifest.assets) {
    if (excludedPaths?.has(asset.path)) continue;
    const snap = snapshots.find((s) => s.path === asset.path);
    if (!snap || !snap.exists) continue;
    if (snap.sha256 !== asset.sha256) {
      conflicts.push({ path: asset.path, code: 'MODIFIED_OWNED_ASSET', detail: 'Asset was modified since installation and will not be removed' });
      continue;
    }
    changes.push({ path: asset.path, realPath: snap.realPath, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: `Delete ${asset.path}` } });
  }
  return { changes, conflicts };
}

export function createRemovalFinding(conflict: PlanConflict, harness: HarnessId | null): DiagnosticFinding {
  if (conflict.code === 'INVALID_HARNESS_CONFIG') {
    return {
      code: 'INVALID_HARNESS_CONFIG',
      severity: 'error',
      scope: 'file',
      harness,
      path: conflict.path,
      message: conflict.detail,
      impact: 'ContextBrake left this harness installed because its configuration could not be parsed.',
      remediation: `Fix or restore ${conflict.path}, then run context-brake remove again.`,
    };
  }
  return {
    code: conflict.code,
    severity: 'error',
    scope: 'file',
    harness: null,
    path: conflict.path,
    message: conflict.detail,
    impact: 'This file could not be removed.',
    remediation: 'Inspect file permissions or modifications.',
  };
}
