import { resolve } from 'node:path';
import type { ParsedInitArgs } from '../argument-parser.js';
import type { ProcessRunner } from '../../core/contracts/processes.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { DiagnosticFinding, InstallReport } from '../../core/contracts/diagnostics.js';
import { ProjectConfigStore } from '../../infrastructure/storage/project-config-store.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeChangeApplier } from '../../infrastructure/storage/change-applier.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { planInstallation } from '../../core/services/installation-service.js';
import { buildInstallReport } from '../../core/services/report-service.js';
import { renderJsonOutput } from '../output/json.js';
import { renderInstallText, renderFinding } from '../output/text.js';
import { collectProjectSnapshots } from '../snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from '../detection-collector.js';
import { authorizeWrite } from '../confirmation.js';

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

async function loadInitSnapshots(root: string, config: ContextBrakeConfig | null, userFiles: readonly string[]) {
  const allSnapshots = await collectProjectSnapshots(root, config, userFiles);
  const protocolSnap = allSnapshots.find((s) => s.path === (config?.instructionFiles.protocolFile ?? 'docs/context-brake-protocol.md'))!;
  const instTargets = config?.instructionFiles.targets ?? ['CLAUDE.md', 'AGENTS.md'];
  const instSnaps = allSnapshots.filter((s) => instTargets.includes(s.path) || userFiles.includes(s.path));
  return { allSnapshots, protocolSnap, instSnaps };
}

function emitLegacyPreview(findings: readonly DiagnosticFinding[], json: boolean): void {
  if (json) return;
  for (const finding of findings) {
    if (finding.code === 'LEGACY_BLOCK_DETECTED') process.stderr.write(`${renderFinding(finding)}\n`);
  }
}

export async function runInit(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const config = await loadExistingConfig(env.projectRoot);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const { allSnapshots, protocolSnap, instSnaps } = await loadInitSnapshots(env.projectRoot, config, args.instructionFile);
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest);
  const sources = await collectHarnessSources(adapters, ctx);
  const selection = {
    ...(args.harness.length > 0 ? { include: args.harness } : {}),
    ...(args.excludeHarness.length > 0 ? { exclude: args.excludeHarness } : {}),
  };
  const result = await planInstallation({
    projectRoot: env.projectRoot, config, adapters, context: ctx, sources, selection,
    instructionSnapshots: instSnaps, protocolSnapshot: protocolSnap, allSnapshots,
    createInstructions: args.createInstructions, migrateLegacy: args.migrateLegacy, previousManifest: manifest,
  });
  if (args.dryRun) {
    const report = buildInstallReport({ command: 'init', mode: 'dry_run', detections: result.detections, plan: result.plan, outcomes: [], findings: result.findings });
    return outputReport(report, args.json);
  }
  emitLegacyPreview(result.findings, args.json);
  const confirmed = await authorizeWrite(args.yes, result.plan.requiresConfirmation, 'Apply ContextBrake installation plan?');
  if (!confirmed) return 0;
  const applier = new NodeChangeApplier();
  const applyReport = await applier.apply(result.plan);
  const report = buildInstallReport({ command: 'init', mode: 'applied', detections: result.detections, plan: result.plan, outcomes: applyReport.outcomes, findings: result.findings });
  return outputReport(report, args.json);
}
