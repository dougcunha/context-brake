import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { ChangePlan, FileSnapshot, PlannedChange } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { DetectionSelection, DetectionSources, HarnessDetection, HarnessId } from '../contracts/harness.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest } from '../contracts/manifest.js';
import { protectModifiedAssets } from './asset-currency.js';
import { createChangePlan } from './change-plan-service.js';
import { detectHarnesses } from './detection-service.js';
import { buildManagedAssets, conflictFindings } from './installation-findings.js';
import { planConfigChange } from './installation-builder.js';
import { planAdapters } from './installation-adapters.js';
import { hasSameHarnesses } from './harness-exclusion.js';
import { planHarnessRemovals, type HarnessRemovals } from './harness-removal.js';
import { noProjectHarnessFinding } from './no-harness-finding.js';
import { planManifestChange } from './manifest-change.js';
import type { DroppedKey } from '../validation/configuration-sanitizer.js';
import type { SnapshotUpdate } from './snapshot-merge.js';
import type { AutoRestartUpdate } from './auto-restart-merge.js';
import type { DebugModeUpdate } from './debug-mode-merge.js';
import type { GitIgnoreUpdate } from './gitignore-merge.js';
import { HANDOFF_IGNORE_PATH, planRestartExtras } from './restart-install-extras.js';
import { RESTART_LOG_RELATIVE_DIR } from '../contracts/restart-log.js';
import { planGitIgnoreForInstall } from './gitignore-plan.js';

export type InstallationInput = {
  projectRoot: string;
  config: ContextBrakeConfig | null;
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  sources: Partial<DetectionSources>;
  selection?: DetectionSelection;
  excluded?: readonly HarnessId[] | undefined;
  allSnapshots: readonly FileSnapshot[];
  previousManifest?: InstallationManifest | null;
  packageVersion: string;
  snapshotUpdate?: SnapshotUpdate | undefined;
  debug?: DebugModeUpdate | undefined;
  gitIgnore?: GitIgnoreUpdate | undefined;
  autoRestart?: AutoRestartUpdate | undefined;
  dropped?: readonly DroppedKey[] | undefined;
  insideGit?: boolean | undefined;
};

export type InstallationResult = {
  detections: readonly HarnessDetection[];
  plan: ChangePlan;
  findings: readonly DiagnosticFinding[];
  ignoredPaths: readonly string[];
};

function emptyResult(root: string, detections: readonly HarnessDetection[]): InstallationResult {
  const plan: ChangePlan = { schemaVersion: 1, projectRoot: root, changes: [], conflicts: [], harnesses: [], requiresConfirmation: false };
  return { detections, plan, findings: [noProjectHarnessFinding(detections)], ignoredPaths: [] };
}

function hasExclusionChange(input: InstallationInput): boolean {
  return !hasSameHarnesses(input.excluded ?? [], input.config?.excludedHarnesses ?? []);
}

async function planExcludedRemovals(input: InstallationInput): Promise<HarnessRemovals> {
  const installed = new Set<HarnessId>([...(input.config?.activeHarnesses ?? []), ...(input.previousManifest?.entries.map((entry) => entry.harness) ?? [])]);
  const adapters = input.adapters.filter((adapter) => (input.excluded ?? []).includes(adapter.id) && installed.has(adapter.id));
  return planHarnessRemovals({ adapters, context: input.context, protection: { manifest: input.previousManifest ?? null, snapshots: input.allSnapshots } });
}

export async function planInstallation(input: InstallationInput): Promise<InstallationResult> {
  const detections = detectHarnesses(input.sources, input.selection);
  const active = detections.filter((d) => d.state === 'project');
  const removals = await planExcludedRemovals(input);
  if (active.length === 0 && !hasExclusionChange(input) && removals.harnesses.length === 0) return emptyResult(input.projectRoot, detections);
  const activeIds: HarnessId[] = active.map((d) => d.harness);
  const cfg = planConfigChange({ root: input.projectRoot, current: input.config, active: activeIds, snapshot: input.allSnapshots.find((s) => s.path === 'context-brake.config.json'), snapshotUpdate: input.snapshotUpdate, debug: input.debug, gitIgnore: input.gitIgnore, autoRestart: input.autoRestart, dropped: input.dropped, excluded: input.excluded, retained: [...removals.conflictedHarnesses] });
  const ap = await planAdapters(input.adapters, active, input.context);
  const extras = planRestartExtras({ wanted: input.context.autoRestart === true, adapters: input.adapters, active, snapshot: input.allSnapshots.find((s) => s.path === HANDOFF_IGNORE_PATH), logs: input.allSnapshots.filter((s) => s.path.startsWith(`${RESTART_LOG_RELATIVE_DIR}/`)), previousManifest: input.previousManifest ?? null });
  const protection = protectModifiedAssets(ap.changes, input.previousManifest ?? null, input.allSnapshots);
  const modifiedPaths = new Set(protection.conflicts.map((c) => c.path));
  const preservedAssets = (input.previousManifest?.assets ?? []).filter((a) => modifiedPaths.has(a.path));
  const adapterAssets = [...ap.assets.filter((a) => !modifiedPaths.has(a.path)), ...preservedAssets, ...extras.assets];
  const allAssets = buildManagedAssets(cfg.change.content ?? '', adapterAssets);
  const manifestChanges = active.length === 0 && !input.previousManifest ? [] : [planManifestChange({ root: input.projectRoot, assets: allAssets, entries: ap.entries, prev: input.previousManifest ?? null, pkgVer: input.packageVersion, snapshot: input.allSnapshots.find((s) => s.path === MANIFEST_RELATIVE_PATH) })];
  const plannedChanges: PlannedChange[] = [cfg.change, ...manifestChanges, ...protection.changes, ...extras.changes, ...removals.changes];
  const ignore = planGitIgnoreForInstall({ root: input.projectRoot, enabled: cfg.config.gitIgnore !== false, insideGit: input.insideGit ?? false, hasInstall: manifestChanges.length > 0, assetPaths: allAssets.map((asset) => asset.path), changes: plannedChanges, snapshots: input.allSnapshots });
  const conflicts = [...ap.conflicts, ...protection.conflicts, ...ignore.conflicts];
  const findings: DiagnosticFinding[] = [...conflictFindings(conflicts), ...ap.findings, ...extras.findings, ...removals.findings, ...ignore.findings];
  const changes = ignore.change === null ? plannedChanges : [...plannedChanges, ignore.change];
  const plan = createChangePlan({ projectRoot: input.projectRoot, plannedChanges: changes, conflicts: [...conflicts, ...removals.conflicts], snapshots: input.allSnapshots, harnesses: [...ap.harnesses, ...removals.harnesses] });
  return { detections, plan, findings, ignoredPaths: ignore.paths };
}
