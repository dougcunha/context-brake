import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { ChangePlan, FileSnapshot, HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { DetectionSelection, DetectionSources, HarnessDetection, HarnessId } from '../contracts/harness.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest, type ManagedAsset, type ManagedEntry } from '../contracts/manifest.js';
import { protectModifiedAssets } from './asset-currency.js';
import { createChangePlan, hashString } from './change-plan-service.js';
import { detectHarnesses } from './detection-service.js';
import { planGitignoreInstall } from './gitignore-service.js';
import { buildManagedAssets, conflictFindings } from './installation-findings.js';
import { detectLegacyFindings, legacyFinding } from './legacy-preview.js';
import { planConfigChange, planManifestChange } from './installation-builder.js';
import { planInstructionChanges } from './instruction-service.js';
import { planProtocolChange } from './protocol-service.js';
import type { DelegatedSnapshotUpdate } from './delegated-snapshot-merge.js';

export type InstallationInput = {
  projectRoot: string;
  config: ContextBrakeConfig | null;
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  sources: Partial<DetectionSources>;
  selection?: DetectionSelection;
  instructionSnapshots: readonly FileSnapshot[];
  protocolSnapshot: FileSnapshot;
  gitignoreSnapshot: FileSnapshot;
  allSnapshots: readonly FileSnapshot[];
  createInstructions?: boolean;
  migrateLegacy?: boolean;
  previousManifest?: InstallationManifest | null;
  packageVersion: string;
  delegatedSnapshot?: DelegatedSnapshotUpdate | undefined;
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
    const profile = adapter.capabilityProfile();
    harnesses.push({ harness: d.harness, outcome, supportLevel: profile.supportLevel, limitations: [...profile.limitations] });
  }
  return { changes, conflicts, entries, assets, harnesses };
}

export async function planInstallation(input: InstallationInput): Promise<InstallationResult> {
  const detections = detectHarnesses(input.sources, input.selection);
  const active = detections.filter((d) => d.state === 'project');
  if (active.length === 0) return emptyResult(input.projectRoot, detections, detectLegacyFindings(input.instructionSnapshots, input.config ?? DEFAULT_CONFIG));
  const activeIds: HarnessId[] = active.map((d) => d.harness);
  const cfg = planConfigChange({ root: input.projectRoot, current: input.config, active: activeIds, snapshot: input.allSnapshots.find((s) => s.path === 'context-brake.config.json'), delegatedSnapshot: input.delegatedSnapshot });
  const proto = planProtocolChange(cfg.config, input.protocolSnapshot, Boolean(input.previousManifest?.assets.some((a) => a.kind === 'protocol')));
  const inst = planInstructionChanges({ snapshots: input.instructionSnapshots, config: cfg.config, createInstructions: input.createInstructions, migrateLegacy: input.migrateLegacy });
  const gi = planGitignoreInstall({ snapshot: input.gitignoreSnapshot, config: cfg.config });
  const ap = await planAdapters(input.adapters, active, input.context);
  const protection = protectModifiedAssets(ap.changes, input.previousManifest ?? null, input.allSnapshots);
  const modifiedPaths = new Set(protection.conflicts.map((c) => c.path));
  const preservedAssets = (input.previousManifest?.assets ?? []).filter((a) => modifiedPaths.has(a.path));
  const adapterAssets = [...ap.assets.filter((a) => !modifiedPaths.has(a.path)), ...preservedAssets];
  const allAssets = buildManagedAssets(cfg.config, cfg.change.content ?? '', adapterAssets);
  const manifestChange = planManifestChange({ root: input.projectRoot, assets: allAssets, entries: ap.entries, prev: input.previousManifest ?? null, pkgVer: input.packageVersion, snapshot: input.allSnapshots.find((s) => s.path === MANIFEST_RELATIVE_PATH) });
  const plannedChanges: PlannedChange[] = [cfg.change, manifestChange, ...inst.changes, ...gi.changes, ...protection.changes];
  if (proto.change) plannedChanges.push(proto.change);
  const conflicts = [...inst.conflicts, ...gi.conflicts, ...(proto.conflict ? [proto.conflict] : []), ...ap.conflicts, ...protection.conflicts];
  const findings: DiagnosticFinding[] = [
    ...conflictFindings(conflicts),
    ...inst.legacyDetected.map((path) => legacyFinding(path, cfg.config)),
  ];
  const plan = createChangePlan({ projectRoot: input.projectRoot, plannedChanges, conflicts, snapshots: input.allSnapshots, harnesses: ap.harnesses });
  return { detections, plan, findings };
}
