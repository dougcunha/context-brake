import { resolve } from 'node:path';
import type { ParsedRemoveArgs } from '../argument-parser.js';
import type { CommandEnv } from './init.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { InstallReport } from '../../core/contracts/diagnostics.js';
import { ProjectConfigStore } from '../../infrastructure/storage/project-config-store.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeChangeApplier } from '../../infrastructure/storage/change-applier.js';
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

async function loadRemoveSnapshots(root: string, config: ContextBrakeConfig | null) {
  const allSnapshots = await collectProjectSnapshots(root, config);
  const protocolSnap = allSnapshots.find((s) => s.path === (config?.instructionFiles.protocolFile ?? 'docs/context-brake-protocol.md'))!;
  const gitignoreSnap = allSnapshots.find((s) => s.path === '.gitignore')!;
  const instTargets = config?.instructionFiles.targets ?? ['CLAUDE.md', 'AGENTS.md'];
  const instSnaps = allSnapshots.filter((s) => instTargets.includes(s.path));
  const planSnap = allSnapshots.find((s) => s.path === (config?.stateStorage.planFile ?? 'task_plan.json'));
  const checkpointSnap = allSnapshots.find((s) => s.path === (config?.stateStorage.checkpointFile ?? 'state_checkpoint.json'));
  return { allSnapshots, protocolSnap, gitignoreSnap, instSnaps, planSnap, checkpointSnap };
}

export async function runRemove(args: ParsedRemoveArgs, env: CommandEnv): Promise<number> {
  const config = await loadExistingConfig(env.projectRoot);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const snaps = await loadRemoveSnapshots(env.projectRoot, config);
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest);
  const result = await planRemoval({
    projectRoot: env.projectRoot, config, adapters, context: ctx,
    instructionSnapshots: snaps.instSnaps, protocolSnapshot: snaps.protocolSnap, gitignoreSnapshot: snaps.gitignoreSnap, allSnapshots: snaps.allSnapshots,
    manifest, removeState: args.removeState,
    ...(snaps.planSnap ? { planSnapshot: snaps.planSnap } : {}),
    ...(snaps.checkpointSnap ? { checkpointSnapshot: snaps.checkpointSnap } : {}),
  });
  if (args.dryRun) {
    const report = buildInstallReport({ command: 'remove', mode: 'dry_run', detections: [], plan: result.plan, outcomes: [], findings: result.findings });
    return outputReport(report, args.json);
  }
  const confirmed = await authorizeWrite(args.yes, result.plan.requiresConfirmation, 'Apply ContextBrake removal plan?');
  if (!confirmed) return 0;
  const applier = new NodeChangeApplier();
  const applyReport = await applier.apply(result.plan);
  const report = buildInstallReport({ command: 'remove', mode: 'applied', detections: [], plan: result.plan, outcomes: applyReport.outcomes, findings: result.findings });
  return outputReport(report, args.json);
}
