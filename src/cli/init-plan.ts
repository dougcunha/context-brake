import type { StatuslineBridgeRequest } from '../core/contracts/adapter.js';
import type { ContextBrakeConfig } from '../core/contracts/configuration.js';
import type { DiagnosticFinding } from '../core/contracts/diagnostics.js';
import type { HarnessId } from '../core/contracts/harness.js';
import { isAutoRestartWanted } from '../core/services/auto-restart-merge.js';
import { planInstallation, type InstallationResult } from '../core/services/installation-service.js';
import { NodeManifestStore } from '../infrastructure/storage/manifest-store.js';
import { readPackageVersion } from '../infrastructure/storage/package-metadata.js';
import { getAllAdapters } from '../infrastructure/harnesses/registry.js';
import { isInsideGitWorkingTree, trackedOwnedFiles } from '../infrastructure/git/git-context.js';
import { NodeProcessRunner } from '../infrastructure/process/node-process-runner.js';
import { keptHandoffFindings } from './handoff-findings.js';
import { collectProjectSnapshots, collectRestartLogSnapshots } from './snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from './detection-collector.js';
import { KEEP_UPDATES, type ConfigUpdates } from './init-config-updates.js';
import { loadInitConfigState } from './init-config-state.js';
import { trackedFilesFindings } from './gitignore-findings.js';
import type { CommandEnv } from './init-flow.js';

export type InitPlanRequest = {
  readonly harness: readonly HarnessId[];
  readonly excludeHarness: readonly HarnessId[];
  readonly statuslineBridge: StatuslineBridgeRequest;
  readonly noAutoRestart: boolean;
  readonly configUpdates?: (config: ContextBrakeConfig | null) => ConfigUpdates;
  readonly overwritePaths?: ReadonlySet<string>;
};

export type InitPlan = { readonly result: InstallationResult; readonly findings: readonly DiagnosticFinding[] };

async function extraFindings(request: InitPlanRequest, env: CommandEnv, result: InstallationResult): Promise<DiagnosticFinding[]> {
  const kept = request.noAutoRestart ? await keptHandoffFindings(env.projectRoot) : [];
  const tracked = await trackedOwnedFiles(env.runner ?? new NodeProcessRunner(), env.projectRoot, result.ignoredPaths);
  return [...result.findings, ...kept, ...trackedFilesFindings(tracked)];
}

export async function planInit(env: CommandEnv, request: InitPlanRequest): Promise<InitPlan> {
  const { config, dropped, excluded, selection } = await loadInitConfigState(env.projectRoot, { include: request.harness, exclude: request.excludeHarness });
  const updates = request.configUpdates?.(config) ?? KEEP_UPDATES;
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const allSnapshots = [...await collectProjectSnapshots(env.projectRoot), ...(request.noAutoRestart ? await collectRestartLogSnapshots(env.projectRoot) : [])];
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest, { statuslineBridge: request.statuslineBridge, autoRestart: isAutoRestartWanted(config?.autoRestart, updates.autoRestart) });
  const result = await planInstallation({
    projectRoot: env.projectRoot, config, adapters, context: ctx, sources: await collectHarnessSources(adapters, ctx), selection, excluded,
    allSnapshots, previousManifest: manifest, insideGit: await isInsideGitWorkingTree(env.projectRoot),
    packageVersion: await readPackageVersion(), snapshotUpdate: updates.snapshot, debug: updates.debug, gitIgnore: updates.gitIgnore, autoRestart: updates.autoRestart, dropped,
    overwritePaths: request.overwritePaths,
  });
  return { result, findings: await extraFindings(request, env, result) };
}
