import { keptHandoffFindings } from '../handoff-findings.js';
import { isAutoRestartWanted } from '../../core/services/auto-restart-merge.js';
import { assertAutoRestartTarget, assertStatuslineBridgeTarget, type ParsedInitArgs } from '../init-arguments.js';
import type { ProcessRunner } from '../../core/contracts/processes.js';
import type { InstallReport, OverheadMeasurer } from '../../core/contracts/diagnostics.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeChangeApplier } from '../../infrastructure/storage/change-applier.js';
import { readPackageVersion } from '../../infrastructure/storage/package-metadata.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { planInstallation } from '../../core/services/installation-service.js';
import { buildInstallReport } from '../../core/services/report-service.js';
import { renderJsonOutput } from '../output/json.js';
import { renderInstallText } from '../output/text.js';
import { collectProjectSnapshots, collectRestartLogSnapshots } from '../snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from '../detection-collector.js';
import { authorizeWrite } from '../confirmation.js';
import { planConfigUpdates } from '../init-config-updates.js';
import { loadInitConfigState } from '../init-config-state.js';

export type CommandEnv = { projectRoot: string; runner?: ProcessRunner; userHome?: string; overheadMeasurer?: OverheadMeasurer };

function outputReport(report: InstallReport, json: boolean): number {
  if (json) {
    renderJsonOutput(report);
  } else {
    renderInstallText(report);
  }
  return report.exitCode;
}

export async function runInit(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const { config, dropped, excluded, selection } = await loadInitConfigState(env.projectRoot, { include: args.harness, exclude: args.excludeHarness });
  const updates = planConfigUpdates(config, args);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const allSnapshots = [...await collectProjectSnapshots(env.projectRoot), ...(args.noAutoRestart ? await collectRestartLogSnapshots(env.projectRoot) : [])];
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest, { statuslineBridge: args.statuslineBridge ?? 'default', autoRestart: isAutoRestartWanted(config?.autoRestart, updates.autoRestart) });
  const sources = await collectHarnessSources(adapters, ctx);
  const result = await planInstallation({
    projectRoot: env.projectRoot, config, adapters, context: ctx, sources, selection, excluded,
    allSnapshots, previousManifest: manifest,
    packageVersion: await readPackageVersion(), snapshotUpdate: updates.snapshot, debug: updates.debug, autoRestart: updates.autoRestart, dropped,
  });
  assertStatuslineBridgeTarget(args.statuslineBridge, result.detections);
  assertAutoRestartTarget(args, result.detections, adapters);
  const kept = args.noAutoRestart ? await keptHandoffFindings(env.projectRoot) : [];
  if (args.dryRun) {
    const report = buildInstallReport({ command: 'init', mode: 'dry_run', detections: result.detections, plan: result.plan, outcomes: [], findings: [...result.findings, ...kept] });
    return outputReport(report, args.json);
  }
  const confirmed = await authorizeWrite(args.yes, result.plan.requiresConfirmation, 'Apply ContextBrake installation plan?');
  if (!confirmed) return 0;
  const applier = new NodeChangeApplier();
  const applyReport = await applier.apply(result.plan);
  const report = buildInstallReport({ command: 'init', mode: 'applied', detections: result.detections, plan: result.plan, outcomes: applyReport.outcomes, findings: [...result.findings, ...kept] });
  return outputReport(report, args.json);
}