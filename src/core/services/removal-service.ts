import { resolve } from 'node:path';
import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { ChangePlan, FileSnapshot, HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest } from '../contracts/manifest.js';
import { createChangePlan } from './change-plan-service.js';
import { planAssetDeletions, planInstructionRemoval } from './removal-helper.js';

export type RemovalInput = {
  projectRoot: string;
  config: ContextBrakeConfig | null;
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  instructionSnapshots: readonly FileSnapshot[];
  protocolSnapshot: FileSnapshot;
  allSnapshots: readonly FileSnapshot[];
  manifest: InstallationManifest | null;
  removeState?: boolean;
  planSnapshot?: FileSnapshot;
  checkpointSnapshot?: FileSnapshot;
};

export type RemovalResult = {
  plan: ChangePlan;
  findings: readonly DiagnosticFinding[];
};

function planStateDeletions(input: RemovalInput): PlannedChange[] {
  const changes: PlannedChange[] = [];
  if (!input.removeState) return changes;
  for (const snap of [input.planSnapshot, input.checkpointSnapshot]) {
    if (!snap?.exists) continue;
    changes.push({ path: snap.path, realPath: snap.realPath, kind: 'delete', owner: 'config', content: null, preview: { summary: `Delete ${snap.path}` } });
  }
  return changes;
}

function planCoreDeletions(input: RemovalInput): PlannedChange[] {
  const changes: PlannedChange[] = [];
  if (input.protocolSnapshot.exists) {
    changes.push({ path: input.protocolSnapshot.path, realPath: input.protocolSnapshot.realPath, kind: 'delete', owner: 'protocol', content: null, preview: { summary: 'Delete protocol file' } });
  }
  const mSnap = input.allSnapshots.find((s) => s.path === MANIFEST_RELATIVE_PATH);
  const mPath = (mSnap?.realPath ?? resolve(input.projectRoot, MANIFEST_RELATIVE_PATH)).replace(/\\/g, '/');
  changes.push({ path: MANIFEST_RELATIVE_PATH, realPath: mPath, kind: 'delete', owner: 'manifest', content: null, preview: { summary: 'Delete manifest' } });
  const cSnap = input.allSnapshots.find((s) => s.path === 'context-brake.config.json');
  const cPath = (cSnap?.realPath ?? resolve(input.projectRoot, 'context-brake.config.json')).replace(/\\/g, '/');
  changes.push({ path: 'context-brake.config.json', realPath: cPath, kind: 'delete', owner: 'config', content: null, preview: { summary: 'Delete configuration file' } });
  return changes;
}

async function planAdapterRemovals(input: RemovalInput): Promise<{ changes: PlannedChange[]; conflicts: PlanConflict[]; harnesses: HarnessInstallPlan[] }> {
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  const harnesses: HarnessInstallPlan[] = [];
  const installed = new Set<string>([...(input.manifest?.entries.map((e) => e.harness) ?? []), ...(input.config?.activeHarnesses ?? [])]);
  const active = installed.size > 0 ? input.adapters.filter((a) => installed.has(a.id)) : input.adapters;
  for (const adapter of active) {
    const aPlan = await adapter.planRemove(input.context);
    changes.push(...aPlan.changes);
    conflicts.push(...aPlan.conflicts);
    harnesses.push({ harness: adapter.id, outcome: 'planned', supportLevel: adapter.capabilityProfile().supportLevel });
  }
  return { changes, conflicts, harnesses };
}

export async function planRemoval(input: RemovalInput): Promise<RemovalResult> {
  const adapterResult = await planAdapterRemovals(input);
  const assetPlan = planAssetDeletions(input.manifest, input.allSnapshots);
  const plannedChanges: PlannedChange[] = [
    ...adapterResult.changes,
    ...assetPlan.changes,
    ...planInstructionRemoval(input.instructionSnapshots),
    ...planStateDeletions(input),
    ...planCoreDeletions(input),
  ];
  const conflicts: PlanConflict[] = [...adapterResult.conflicts, ...assetPlan.conflicts];
  const findings: DiagnosticFinding[] = conflicts.map((c) => ({
    code: c.code, severity: 'error', scope: 'file', harness: null, path: c.path,
    message: c.detail, impact: 'This file could not be removed.', remediation: 'Inspect file permissions or modifications.',
  }));
  const plan = createChangePlan({ projectRoot: input.projectRoot, plannedChanges, conflicts, snapshots: input.allSnapshots, harnesses: adapterResult.harnesses });
  return { plan, findings };
}
