import { resolve } from 'node:path';
import { keptHandoffFindings } from '../handoff-findings.js';
import type { ParsedRemoveArgs } from '../argument-parser.js';
import type { CommandEnv } from './init.js';
import type { InstallReport } from '../../core/contracts/diagnostics.js';
import { ProjectConfigStore } from '../../infrastructure/storage/project-config-store.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeChangeApplier } from '../../infrastructure/storage/change-applier.js';
import { snapshotFiles } from '../../infrastructure/storage/node-file-system.js';
import { listRuntimeStateFiles } from '../../infrastructure/storage/runtime-state-files.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { planRemoval } from '../../core/services/removal-service.js';
import { buildInstallReport } from '../../core/services/report-service.js';
import { renderJsonOutput } from '../output/json.js';
import { renderInstallText } from '../output/text.js';
import { collectProjectSnapshots } from '../snapshot-helper.js';
import { buildHarnessContext } from '../detection-collector.js';
import { authorizeWrite } from '../confirmation.js';

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

async function loadRuntimeStateSnapshots(root: string) {
  const paths = await listRuntimeStateFiles(root);
  return paths.length > 0 ? snapshotFiles(root, paths) : [];
}

export async function runRemove(args: ParsedRemoveArgs, env: CommandEnv): Promise<number> {
  const config = await loadExistingConfig(env.projectRoot);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const allSnapshots = await collectProjectSnapshots(env.projectRoot);
  const runtimeStateSnapshots = await loadRuntimeStateSnapshots(env.projectRoot);
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest);
  const result = await planRemoval({
    projectRoot: env.projectRoot, config, adapters, context: ctx,
    allSnapshots: [...allSnapshots, ...runtimeStateSnapshots], manifest, runtimeStateSnapshots,
  });
  if (args.dryRun) {
    const report = buildInstallReport({ command: 'remove', mode: 'dry_run', detections: [], plan: result.plan, outcomes: [], findings: [...result.findings, ...await keptHandoffFindings(env.projectRoot)] });
    return outputReport(report, args.json);
  }
  const confirmed = await authorizeWrite(args.yes, result.plan.requiresConfirmation, 'Apply ContextBrake removal plan?');
  if (!confirmed) return 0;
  const applier = new NodeChangeApplier({ pruneRuntime: true });
  const applyReport = await applier.apply(result.plan);
  const report = buildInstallReport({ command: 'remove', mode: 'applied', detections: [], plan: result.plan, outcomes: applyReport.outcomes, findings: [...result.findings, ...await keptHandoffFindings(env.projectRoot)] });
  return outputReport(report, args.json);
}
