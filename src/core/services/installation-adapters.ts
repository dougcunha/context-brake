import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { HarnessDetection } from '../contracts/harness.js';
import type { ConfigOrigin, ManagedAsset, ManagedEntry } from '../contracts/manifest.js';
import { hashString } from './change-plan-service.js';

export async function planAdapters(adapters: readonly HarnessAdapter[], active: readonly HarnessDetection[], ctx: HarnessContext) {
  const changes: PlannedChange[] = [];
  const conflicts: PlanConflict[] = [];
  const entries: ManagedEntry[] = [];
  const assets: ManagedAsset[] = [];
  const configOrigins: ConfigOrigin[] = [];
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
    configOrigins.push(...(aPlan.configOrigins ?? []));
    for (const c of aPlan.changes) if (c.owner === 'runtime_asset' && c.content) assets.push({ path: c.path, kind: 'runtime_asset', sha256: hashString(c.content) });
    if (aPlan.assets) assets.push(...aPlan.assets);
    const outcome = aPlan.conflicts.length > 0 ? 'conflict' : aPlan.changes.length > 0 ? 'planned' : 'skipped';
    const profile = adapter.capabilityProfile();
    harnesses.push({ harness: d.harness, outcome, supportLevel: profile.supportLevel, limitations: [...profile.limitations] });
  }
  return { changes, conflicts, entries, assets, configOrigins, harnesses, findings };
}
