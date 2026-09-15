import { resolve } from 'node:path';
import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { ChangePlan, FileSnapshot, HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest } from '../contracts/manifest.js';
import { createChangePlan } from './change-plan-service.js';
import { planGitignoreRemoval } from './gitignore-service.js';
import { createRemovalFinding, planAssetDeletions, planInstructionRemoval } from './removal-helper.js';
import { planRuntimeStateDeletions, planStateDeletions } from './state-removal.js';

export type RemovalInput = {
  projectRoot: string;
  config: ContextBrakeConfig | null;
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  instructionSnapshots: readonly FileSnapshot[];
  protocolSnapshot: FileSnapshot;
  gitignoreSnapshot: FileSnapshot;
  allSnapshots: readonly FileSnapshot[];
  manifest: InstallationManifest | null;
  removeState?: boolean;
  planSnapshot?: FileSnapshot;
  checkpointSnapshot?: FileSnapshot;
  runtimeStateSnapshots?: readonly FileSnapshot[];
};

export type RemovalResult = {
  plan: ChangePlan;
  findings: readonly DiagnosticFinding[];
};

function planCoreDeletions(input: RemovalInput, hasConflicts: boolean): PlannedChange[] {
  const changes: PlannedChange[] = [];
  if (input.protocolSnapshot.exists) {
    changes.push({ path: input.protocolSnapshot.path, realPath: input.protocolSnapshot.realPath, kind: 'delete', owner: 'protocol', content: null, preview: { summary: 'Delete protocol file' } });
  }
  if (hasConflicts) return changes;
  const mSnap = input.allSnapshots.find((s) => s.path === MANIFEST_RELATIVE_PATH);
  const mPath = (mSnap?.realPath ?? resolve(input.projectRoot, MANIFEST_RELATIVE_PATH)).replace(/\\/g, '/');
  changes.push({ path: MANIFEST_RELATIVE_PATH, realPath: mPath, kind: 'delete', owner: 'manifest', content: null, preview: { summary: 'Delete manifest' } });
  const cSnap = input.allSnapshots.find((s) => s.path === 'context-brake.config.json');
  const cPath = (cSnap?.realPath ?? resolve(input.projectRoot, 'context-brake.config.json')).replace(/\\/g, '/');
  changes.push({ path: 'context-brake.config.json', realPath: cPath, kind: 'delete', owner: 'config', content: null, preview: { summary: 'Delete configuration file' } });
  return changes;
}

async function planAdapterRemovals(input: RemovalInput) {
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  const harnesses: HarnessInstallPlan[] = [];
  const findings: DiagnosticFinding[] = [];
  const conflictedAssetPaths = new Set<string>();
  const installed = new Set<string>([...(input.manifest?.entries.map((e) => e.harness) ?? []), ...(input.config?.activeHarnesses ?? [])]);
  const active = installed.size > 0 ? input.adapters.filter((a) => installed.has(a.id)) : input.adapters;
  for (const adapter of active) {
    const aPlan = await adapter.planRemove(input.context);
    changes.push(...aPlan.changes);
    conflicts.push(...aPlan.conflicts);
    if (aPlan.conflicts.length > 0) {
      for (const p of aPlan.assetPaths ?? []) conflictedAssetPaths.add(p);
      for (const c of aPlan.conflicts) findings.push(createRemovalFinding(c, adapter.id));
    }
    const outcome = aPlan.conflicts.length > 0 ? 'conflict' : 'planned';
    const profile = adapter.capabilityProfile();
    harnesses.push({ harness: adapter.id, outcome, supportLevel: profile.supportLevel, limitations: [...profile.limitations] });
  }
  return { changes, conflicts, harnesses, findings, conflictedAssetPaths };
}

export async function planRemoval(input: RemovalInput): Promise<RemovalResult> {
  const adapterResult = await planAdapterRemovals(input);
  const excludedAssetPaths = new Set(adapterResult.conflictedAssetPaths);
  if (adapterResult.conflicts.length > 0) {
    excludedAssetPaths.add('context-brake.config.json');
    excludedAssetPaths.add(MANIFEST_RELATIVE_PATH);
  }
  const assetPlan = planAssetDeletions(input.manifest, input.allSnapshots, excludedAssetPaths);
  const gitignorePlan = planGitignoreRemoval({ snapshot: input.gitignoreSnapshot, removeState: Boolean(input.removeState) });
  const hasConflicts = adapterResult.conflicts.length > 0 || assetPlan.conflicts.length > 0;
  const plannedChanges: PlannedChange[] = [
    ...adapterResult.changes,
    ...assetPlan.changes,
    ...planInstructionRemoval(input.instructionSnapshots),
    ...planStateDeletions(input),
    ...planRuntimeStateDeletions(input.removeState, input.runtimeStateSnapshots ?? []),
    ...gitignorePlan.changes,
    ...planCoreDeletions(input, hasConflicts),
  ];
  const conflicts: PlanConflict[] = [...adapterResult.conflicts, ...assetPlan.conflicts, ...gitignorePlan.conflicts];
  const assetFindings = assetPlan.conflicts.map((c) => createRemovalFinding(c, null));
  const gitignoreFindings = gitignorePlan.conflicts.map((c) => createRemovalFinding(c, null));
  const findings: DiagnosticFinding[] = [...adapterResult.findings, ...assetFindings, ...gitignoreFindings];
  const plan = createChangePlan({ projectRoot: input.projectRoot, plannedChanges, conflicts, snapshots: input.allSnapshots, harnesses: adapterResult.harnesses });
  return { plan, findings };
}
