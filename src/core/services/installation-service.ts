import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { ChangePlan, FileSnapshot, HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { DetectionSelection, DetectionSources, HarnessDetection, HarnessId } from '../contracts/harness.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest, type ManagedAsset, type ManagedEntry } from '../contracts/manifest.js';
import { protectModifiedAssets } from './asset-currency.js';
import { createChangePlan, hashString } from './change-plan-service.js';
import { detectHarnesses } from './detection-service.js';
import { buildManagedAssets, conflictFindings } from './installation-findings.js';
import { planConfigChange, planManifestChange } from './installation-builder.js';
import type { SnapshotUpdate } from './snapshot-merge.js';
import type { AutoRestartUpdate } from './auto-restart-merge.js';
import type { DebugModeUpdate } from './debug-mode-merge.js';
import { HANDOFF_IGNORE_PATH, planRestartExtras } from './restart-install-extras.js';
import { RESTART_LOG_RELATIVE_DIR } from '../contracts/restart-log.js';

export type InstallationInput = {
  projectRoot: string;
  config: ContextBrakeConfig | null;
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  sources: Partial<DetectionSources>;
  selection?: DetectionSelection;
  allSnapshots: readonly FileSnapshot[];
  previousManifest?: InstallationManifest | null;
  packageVersion: string;
  snapshotUpdate?: SnapshotUpdate | undefined;
  debug?: DebugModeUpdate | undefined;
  autoRestart?: AutoRestartUpdate | undefined;
};

export type InstallationResult = {
  detections: readonly HarnessDetection[];
  plan: ChangePlan;
  findings: readonly DiagnosticFinding[];
};

function emptyResult(root: string, detections: readonly HarnessDetection[]): InstallationResult {
  const finding: DiagnosticFinding = {
    code: 'NO_PROJECT_HARNESS', severity: 'warning', scope: 'project', harness: null, path: null,
    message: 'No project harness was detected.', impact: null, remediation: 'Select one with --harness <id>.',
  };
  return { detections, plan: { schemaVersion: 1, projectRoot: root, changes: [], conflicts: [], harnesses: [], requiresConfirmation: false }, findings: [finding] };
}

async function planAdapters(adapters: readonly HarnessAdapter[], active: readonly HarnessDetection[], ctx: HarnessContext) {
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  const entries: ManagedEntry[] = [];
  const assets: ManagedAsset[] = [];
  const harnesses: HarnessInstallPlan[] = [];
  const findings: DiagnosticFinding[] = [];
  for (const d of active) {
    const adapter = adapters.find((a) => a.id === d.harness);
    if (!adapter) continue;
    const aPlan = await adapter.planInstall(ctx);
    changes.push(...aPlan.changes);
    conflicts.push(...aPlan.conflicts);
    findings.push(...(aPlan.findings ?? []));
    entries.push(...aPlan.entries);
    for (const c of aPlan.changes) if (c.owner === 'runtime_asset' && c.content) assets.push({ path: c.path, kind: 'runtime_asset', sha256: hashString(c.content) });
    if (aPlan.assets) assets.push(...aPlan.assets);
    const outcome = aPlan.conflicts.length > 0 ? 'conflict' : aPlan.changes.length > 0 ? 'planned' : 'skipped';
    const profile = adapter.capabilityProfile();
    harnesses.push({ harness: d.harness, outcome, supportLevel: profile.supportLevel, limitations: [...profile.limitations] });
  }
  return { changes, conflicts, entries, assets, harnesses, findings };
}

export async function planInstallation(input: InstallationInput): Promise<InstallationResult> {
  const detections = detectHarnesses(input.sources, input.selection);
  const active = detections.filter((d) => d.state === 'project');
  if (active.length === 0) return emptyResult(input.projectRoot, detections);
  const activeIds: HarnessId[] = active.map((d) => d.harness);
  const cfg = planConfigChange({ root: input.projectRoot, current: input.config, active: activeIds, snapshot: input.allSnapshots.find((s) => s.path === 'context-brake.config.json'), snapshotUpdate: input.snapshotUpdate, debug: input.debug, autoRestart: input.autoRestart });
  const ap = await planAdapters(input.adapters, active, input.context);
  const extras = planRestartExtras({ wanted: input.context.autoRestart === true, adapters: input.adapters, active, snapshot: input.allSnapshots.find((s) => s.path === HANDOFF_IGNORE_PATH), logs: input.allSnapshots.filter((s) => s.path.startsWith(`${RESTART_LOG_RELATIVE_DIR}/`)), previousManifest: input.previousManifest ?? null });
  const protection = protectModifiedAssets(ap.changes, input.previousManifest ?? null, input.allSnapshots);
  const modifiedPaths = new Set(protection.conflicts.map((c) => c.path));
  const preservedAssets = (input.previousManifest?.assets ?? []).filter((a) => modifiedPaths.has(a.path));
  const adapterAssets = [...ap.assets.filter((a) => !modifiedPaths.has(a.path)), ...preservedAssets, ...extras.assets];
  const allAssets = buildManagedAssets(cfg.change.content ?? '', adapterAssets);
  const manifestChange = planManifestChange({ root: input.projectRoot, assets: allAssets, entries: ap.entries, prev: input.previousManifest ?? null, pkgVer: input.packageVersion, snapshot: input.allSnapshots.find((s) => s.path === MANIFEST_RELATIVE_PATH) });
  const plannedChanges: PlannedChange[] = [cfg.change, manifestChange, ...protection.changes, ...extras.changes];
  const conflicts = [...ap.conflicts, ...protection.conflicts];
  const findings: DiagnosticFinding[] = [...conflictFindings(conflicts), ...ap.findings, ...extras.findings];
  const plan = createChangePlan({ projectRoot: input.projectRoot, plannedChanges, conflicts, snapshots: input.allSnapshots, harnesses: ap.harnesses });
  return { detections, plan, findings };
}
