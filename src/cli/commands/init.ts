import { resolve } from 'node:path';
import { assertStatuslineBridgeTarget, type ParsedInitArgs } from '../init-arguments.js';
import type { ProcessRunner } from '../../core/contracts/processes.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { DiagnosticFinding, InstallReport } from '../../core/contracts/diagnostics.js';
import { ProjectConfigStore } from '../../infrastructure/storage/project-config-store.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeChangeApplier } from '../../infrastructure/storage/change-applier.js';
import { readPackageVersion } from '../../infrastructure/storage/package-metadata.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { planInstallation } from '../../core/services/installation-service.js';
import { buildInstallReport } from '../../core/services/report-service.js';
import { renderJsonOutput } from '../output/json.js';
import { findingPrintKey, renderInstallText, renderFinding } from '../output/text.js';
import { collectProjectSnapshots } from '../snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from '../detection-collector.js';
import { authorizeWrite } from '../confirmation.js';
import { CliArgumentError } from '../argument-validator.js';
import { mergeDelegatedSnapshot, type DelegatedSnapshotFlags, type DelegatedSnapshotUpdate } from '../../core/services/delegated-snapshot-merge.js';

export type CommandEnv = { projectRoot: string; runner?: ProcessRunner; userHome?: string };

async function loadExistingConfig(root: string) {
  const store = new ProjectConfigStore(resolve(root, 'context-brake.config.json'));
  try { return await store.read(); } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

function outputReport(report: InstallReport, json: boolean, alreadyPrinted?: ReadonlySet<string>): number {
  if (json) {
    renderJsonOutput(report);
  } else {
    renderInstallText(report, alreadyPrinted);
  }
  return report.exitCode;
}

async function loadInitSnapshots(root: string, config: ContextBrakeConfig | null, userFiles: readonly string[]) {
  const allSnapshots = await collectProjectSnapshots(root, config, userFiles);
  const protocolSnap = allSnapshots.find((s) => s.path === (config?.instructionFiles.protocolFile ?? 'docs/context-brake-protocol.md'))!;
  const gitignoreSnap = allSnapshots.find((s) => s.path === '.gitignore')!;
  const instTargets = config?.instructionFiles.targets ?? ['CLAUDE.md', 'AGENTS.md'];
  const instSnaps = allSnapshots.filter((s) => instTargets.includes(s.path) || userFiles.includes(s.path));
  return { allSnapshots, protocolSnap, gitignoreSnap, instSnaps };
}

export type PreviewGate = { json: boolean; yes: boolean; dryRun: boolean };

export function emitLegacyPreview(findings: readonly DiagnosticFinding[], gate: PreviewGate): ReadonlySet<string> {
  const printed = new Set<string>();
  if (gate.json || gate.yes || gate.dryRun) return printed;
  for (const finding of findings) {
    if (finding.code !== 'LEGACY_BLOCK_DETECTED') continue;
    process.stderr.write(`${renderFinding(finding)}\n`);
    printed.add(findingPrintKey(finding.code, finding.path));
  }
  return printed;
}

export async function runInit(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const config = await loadExistingConfig(env.projectRoot);
  const delegatedSnapshot = delegatedUpdate(config, args.delegatedSnapshot);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const { allSnapshots, protocolSnap, gitignoreSnap, instSnaps } = await loadInitSnapshots(env.projectRoot, config, args.instructionFile);
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest, args.statuslineBridge);
  const sources = await collectHarnessSources(adapters, ctx);
  const result = await planInstallation({
    projectRoot: env.projectRoot, config, adapters, context: ctx, sources, selection: harnessSelection(args),
    instructionSnapshots: instSnaps, protocolSnapshot: protocolSnap, gitignoreSnapshot: gitignoreSnap, allSnapshots,
    createInstructions: args.createInstructions, migrateLegacy: args.migrateLegacy, previousManifest: manifest,
    packageVersion: await readPackageVersion(), delegatedSnapshot,
  });
  assertStatuslineBridgeTarget(args.statuslineBridge, result.detections);
  if (args.dryRun) {
    const report = buildInstallReport({ command: 'init', mode: 'dry_run', detections: result.detections, plan: result.plan, outcomes: [], findings: result.findings });
    return outputReport(report, args.json);
  }
  const printed = emitLegacyPreview(result.findings, args);
  const confirmed = await authorizeWrite(args.yes, result.plan.requiresConfirmation, 'Apply ContextBrake installation plan?');
  if (!confirmed) return 0;
  const applier = new NodeChangeApplier();
  const applyReport = await applier.apply(result.plan);
  const report = buildInstallReport({ command: 'init', mode: 'applied', detections: result.detections, plan: result.plan, outcomes: applyReport.outcomes, findings: result.findings });
  return outputReport(report, args.json, printed);
}
function delegatedUpdate(config: ContextBrakeConfig | null, flags: DelegatedSnapshotFlags | undefined): DelegatedSnapshotUpdate {
  if (flags === undefined) return { kind: 'keep' };
  const merge = mergeDelegatedSnapshot(config?.delegatedSnapshot, flags);
  if ('error' in merge) throw new CliArgumentError(merge.error);
  return merge.update;
}
function harnessSelection(args: ParsedInitArgs) {
  return {
    ...(args.harness.length > 0 ? { include: args.harness } : {}),
    ...(args.excludeHarness.length > 0 ? { exclude: args.excludeHarness } : {}),
  };
}
