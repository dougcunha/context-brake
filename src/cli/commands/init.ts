import { resolve } from 'node:path';
import { isAutoRestartWanted } from '../../core/services/auto-restart-merge.js';
import { assertAutoRestartTarget, assertStatuslineBridgeTarget, harnessSelection, type ParsedInitArgs } from '../init-arguments.js';
import type { ProcessRunner } from '../../core/contracts/processes.js';
import type { InstallReport } from '../../core/contracts/diagnostics.js';
import { ProjectConfigStore } from '../../infrastructure/storage/project-config-store.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeChangeApplier } from '../../infrastructure/storage/change-applier.js';
import { readPackageVersion } from '../../infrastructure/storage/package-metadata.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { planInstallation } from '../../core/services/installation-service.js';
import { buildInstallReport } from '../../core/services/report-service.js';
import { renderJsonOutput } from '../output/json.js';
import { renderInstallText } from '../output/text.js';
import { collectProjectSnapshots } from '../snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from '../detection-collector.js';
import { authorizeWrite } from '../confirmation.js';
import { planConfigUpdates } from '../init-config-updates.js';

export type CommandEnv = { projectRoot: string; runner?: ProcessRunner; userHome?: string };

async function loadExistingConfig(root: string) {
  const store = new ProjectConfigStore(resolve(root, 'context-brake.config.json'));
  try { return await store.read(); } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

function outputReport(report: InstallReport, json: boolean): number {
  if (json) {
    renderJsonOutput(report);
  } else {
    renderInstallText(report);
  }
  return report.exitCode;
}

export async function runInit(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const config = await loadExistingConfig(env.projectRoot);
  const updates = planConfigUpdates(config, args);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const allSnapshots = await collectProjectSnapshots(env.projectRoot);
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest, { statuslineBridge: args.statuslineBridge ?? 'default', autoRestart: isAutoRestartWanted(config?.autoRestart, updates.autoRestart) });
  const sources = await collectHarnessSources(adapters, ctx);
  const result = await planInstallation({
    projectRoot: env.projectRoot, config, adapters, context: ctx, sources, selection: harnessSelection(args),
    allSnapshots, previousManifest: manifest,
    packageVersion: await readPackageVersion(), snapshotUpdate: updates.snapshot, debug: updates.debug, autoRestart: updates.autoRestart,
  });
  assertStatuslineBridgeTarget(args.statuslineBridge, result.detections);
  assertAutoRestartTarget(args, result.detections);
  if (args.dryRun) {
    const report = buildInstallReport({ command: 'init', mode: 'dry_run', detections: result.detections, plan: result.plan, outcomes: [], findings: result.findings });
    return outputReport(report, args.json);
  }
  const confirmed = await authorizeWrite(args.yes, result.plan.requiresConfirmation, 'Apply ContextBrake installation plan?');
  if (!confirmed) return 0;
  const applier = new NodeChangeApplier();
  const applyReport = await applier.apply(result.plan);
  const report = buildInstallReport({ command: 'init', mode: 'applied', detections: result.detections, plan: result.plan, outcomes: applyReport.outcomes, findings: result.findings });
  return outputReport(report, args.json);
}