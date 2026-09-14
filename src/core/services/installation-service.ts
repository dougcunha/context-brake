import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { ChangePlan, FileSnapshot, HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { DetectionSelection, DetectionSources, HarnessDetection, HarnessId } from '../contracts/harness.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest, type ManagedAsset, type ManagedEntry } from '../contracts/manifest.js';
import { createChangePlan, hashString } from './change-plan-service.js';
import { detectHarnesses } from './detection-service.js';
import { detectLegacyFindings, legacyFinding } from './legacy-preview.js';
import { planConfigChange, planManifestChange } from './installation-builder.js';
import { planInstructionChanges } from './instruction-service.js';
import { planProtocolChange, renderProtocol } from './protocol-service.js';

export type InstallationInput = {
  projectRoot: string;
  config: ContextBrakeConfig | null;
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  sources: Partial<DetectionSources>;
  selection?: DetectionSelection;
  instructionSnapshots: readonly FileSnapshot[];
  protocolSnapshot: FileSnapshot;
  allSnapshots: readonly FileSnapshot[];
  createInstructions?: boolean;
  migrateLegacy?: boolean;
  previousManifest?: InstallationManifest | null;
  packageVersion?: string;
};

export type InstallationResult = {
  detections: readonly HarnessDetection[];
  plan: ChangePlan;
  findings: readonly DiagnosticFinding[];
};

function emptyResult(root: string, detections: readonly HarnessDetection[], extra: readonly DiagnosticFinding[]): InstallationResult {
  const finding: DiagnosticFinding = {
    code: 'NO_PROJECT_HARNESS', severity: 'warning', scope: 'project', harness: null, path: null,
    message: 'No project harness was detected.', impact: null, remediation: 'Select one with --harness <id>.',
  };
  return { detections, plan: { schemaVersion: 1, projectRoot: root, changes: [], conflicts: [], harnesses: [], requiresConfirmation: false }, findings: [finding, ...extra] };
}

async function planAdapters(adapters: readonly HarnessAdapter[], active: readonly HarnessDetection[], ctx: HarnessContext) {
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  const entries: ManagedEntry[] = [];
  const assets: ManagedAsset[] = [];
  const harnesses: HarnessInstallPlan[] = [];
  for (const d of active) {
    const adapter = adapters.find((a) => a.id === d.harness);
    if (!adapter) continue;
    const aPlan = await adapter.planInstall(ctx);
    changes.push(...aPlan.changes);
    conflicts.push(...aPlan.conflicts);
    entries.push(...aPlan.entries);
    for (const c of aPlan.changes) if (c.owner === 'runtime_asset' && c.content) assets.push({ path: c.path, kind: 'runtime_asset', sha256: hashString(c.content) });
    if (aPlan.assets) assets.push(...aPlan.assets);
    const outcome = aPlan.conflicts.length > 0 ? 'conflict' : aPlan.changes.length > 0 ? 'planned' : 'skipped';
    harnesses.push({ harness: d.harness, outcome, supportLevel: adapter.capabilityProfile().supportLevel });
  }
  return { changes, conflicts, entries, assets, harnesses };
}

export async function planInstallation(input: InstallationInput): Promise<InstallationResult> {
  const detections = detectHarnesses(input.sources, input.selection);
  const active = detections.filter((d) => d.state === 'project');
  if (active.length === 0) return emptyResult(input.projectRoot, detections, detectLegacyFindings(input.instructionSnapshots, input.config ?? DEFAULT_CONFIG));
  const activeIds: HarnessId[] = active.map((d) => d.harness);
  const cfg = planConfigChange({ root: input.projectRoot, current: input.config, active: activeIds, snapshot: input.allSnapshots.find((s) => s.path === 'context-brake.config.json') });
  const proto = planProtocolChange(cfg.config, input.protocolSnapshot, Boolean(input.previousManifest?.assets.some((a) => a.kind === 'protocol')));
  const inst = planInstructionChanges({ snapshots: input.instructionSnapshots, config: cfg.config, createInstructions: input.createInstructions, migrateLegacy: input.migrateLegacy });
  const ap = await planAdapters(input.adapters, active, input.context);
  const allAssets: ManagedAsset[] = [
    { path: 'context-brake.config.json', kind: 'config', sha256: hashString(cfg.change.content!) },
    { path: cfg.config.instructionFiles.protocolFile, kind: 'protocol', sha256: hashString(renderProtocol(cfg.config)) },
    ...ap.assets,
  ];
  const manifestChange = planManifestChange({ root: input.projectRoot, assets: allAssets, entries: ap.entries, prev: input.previousManifest ?? null, pkgVer: input.packageVersion, snapshot: input.allSnapshots.find((s) => s.path === MANIFEST_RELATIVE_PATH) });
  const plannedChanges: PlannedChange[] = [cfg.change, manifestChange, ...inst.changes, ...ap.changes];
  if (proto.change) plannedChanges.push(proto.change);
  const conflicts = [...inst.conflicts, ...(proto.conflict ? [proto.conflict] : []), ...ap.conflicts];
  const findings: DiagnosticFinding[] = [
    ...conflicts.map((c) => ({
      code: c.code, severity: 'error' as const, scope: 'file' as const, harness: null, path: c.path,
      message: c.detail, impact: 'This file could not be modified.', remediation: `Fix syntax or structure in ${c.path}.`,
    })),
    ...inst.legacyDetected.map((path) => legacyFinding(path, cfg.config)),
  ];
  const plan = createChangePlan({ projectRoot: input.projectRoot, plannedChanges, conflicts, snapshots: input.allSnapshots, harnesses: ap.harnesses });
  return { detections, plan, findings };
}
