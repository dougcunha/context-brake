import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { HarnessId } from '../contracts/harness.js';
import type { InstallationManifest } from '../contracts/manifest.js';
import { hashString } from './change-plan-service.js';

export type AssetCurrency = 'current' | 'outdated' | 'modified';

export function classifyAssetCurrency(installedSha: string, manifestSha: string, expectedSha: string): AssetCurrency {
  if (installedSha === expectedSha) return 'current';
  if (installedSha === manifestSha) return 'outdated';
  return 'modified';
}

type OutdatedAssetInfo = { harness: HarnessId; path: string; manifestVersion: string; packageVersion: string };

function assetOutdatedFinding(info: OutdatedAssetInfo): DiagnosticFinding {
  return {
    code: 'ASSET_OUTDATED', severity: 'warning', scope: 'harness', harness: info.harness, path: info.path,
    message: `The runtime asset ${info.path} was installed by ContextBrake ${info.manifestVersion} and differs from the asset in the running ${info.packageVersion}.`,
    impact: null,
    remediation: 'Run context-brake init --yes.',
  };
}

function assetModifiedFinding(harness: HarnessId, path: string): DiagnosticFinding {
  return {
    code: 'ASSET_MODIFIED', severity: 'warning', scope: 'harness', harness, path,
    message: `The runtime asset ${path} differs from the version ContextBrake installed.`,
    impact: 'init and remove leave it untouched, so the harness runs the modified file.',
    remediation: 'Restore or delete the file, then run context-brake init --yes.',
  };
}

export type AssetCurrencyCheckInput = {
  context: HarnessContext;
  manifest: InstallationManifest | null;
  allSnapshots: readonly FileSnapshot[];
  packageVersion: string;
};

export async function assetCurrencyFindings(adapter: HarnessAdapter, input: AssetCurrencyCheckInput): Promise<DiagnosticFinding[]> {
  if (!input.manifest) return [];
  const manifest = input.manifest;
  const plan = await adapter.planInstall(input.context);
  if (plan.conflicts.length > 0) return [];
  const findings: DiagnosticFinding[] = [];
  for (const change of plan.changes) {
    if (change.owner !== 'runtime_asset' || !change.content) continue;
    const manifestAsset = manifest.assets.find((a) => a.path === change.path);
    const snap = input.allSnapshots.find((s) => s.path === change.path);
    if (!manifestAsset || !snap?.exists || !snap.sha256) continue;
    const outcome = classifyAssetCurrency(snap.sha256, manifestAsset.sha256, hashString(change.content));
    if (outcome === 'outdated') findings.push(assetOutdatedFinding({ harness: adapter.id, path: change.path, manifestVersion: manifest.packageVersion, packageVersion: input.packageVersion }));
    else if (outcome === 'modified') findings.push(assetModifiedFinding(adapter.id, change.path));
  }
  return findings;
}

export type AssetProtection = {
  readonly manifest: InstallationManifest | null;
  readonly snapshots: readonly FileSnapshot[];
  readonly overwritePaths?: ReadonlySet<string> | undefined;
};

function isModifiedAsset(change: PlannedChange, protection: AssetProtection): boolean {
  if (change.owner !== 'runtime_asset' || change.content === null || (change.kind !== 'create' && change.kind !== 'update')) return false;
  if (protection.overwritePaths?.has(change.path) === true) return false;
  const manifestAsset = protection.manifest?.assets.find((a) => a.path === change.path);
  const snap = protection.snapshots.find((s) => s.path === change.path);
  if (!manifestAsset || !snap?.exists || !snap.sha256) return false;
  return classifyAssetCurrency(snap.sha256, manifestAsset.sha256, hashString(change.content)) === 'modified';
}

export function protectModifiedAssets(changes: readonly PlannedChange[], protection: AssetProtection): { changes: PlannedChange[]; conflicts: PlanConflict[] } {
  if (!protection.manifest) return { changes: [...changes], conflicts: [] };
  const modified = changes.filter((change) => isModifiedAsset(change, protection));
  return {
    changes: changes.filter((change) => !modified.includes(change)),
    conflicts: modified.map((change) => ({ path: change.path, code: 'MODIFIED_OWNED_ASSET', detail: 'Asset was modified since installation and will not be overwritten' })),
  };
}
