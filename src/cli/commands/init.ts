import { keptHandoffFindings } from '../handoff-findings.js';
import { isAutoRestartWanted } from '../../core/services/auto-restart-merge.js';
import { assertAutoRestartTarget, assertStatuslineBridgeTarget, type ParsedInitArgs } from '../init-arguments.js';
import type { ProcessRunner } from '../../core/contracts/processes.js';
import type { DiagnosticFinding, InstallReport, OverheadMeasurer } from '../../core/contracts/diagnostics.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeChangeApplier } from '../../infrastructure/storage/change-applier.js';
import { readPackageVersion } from '../../infrastructure/storage/package-metadata.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { planInstallation, type InstallationResult } from '../../core/services/installation-service.js';
import { buildInstallReport } from '../../core/services/report-service.js';
import { renderJsonOutput } from '../output/json.js';
import { renderInstallText } from '../output/text.js';
import { collectProjectSnapshots, collectRestartLogSnapshots } from '../snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from '../detection-collector.js';
import { authorizeWrite } from '../confirmation.js';
import { planConfigUpdates } from '../init-config-updates.js';
import { loadInitConfigState } from '../init-config-state.js';
import { printNothingWritten, resolveAssistedArgs } from '../assistant/assistant-session.js';
import { createPromptPort } from '../assistant/prompt-factory.js';
import { confirmWithPort, ReadlinePromptPort, type PromptPort } from '../assistant/prompt-port.js';
import { assertTerminalForAssistant, detectTerminal, shouldRunAssistant, type TerminalInfo } from '../terminal.js';

export type CommandEnv = { projectRoot: string; runner?: ProcessRunner; userHome?: string; overheadMeasurer?: OverheadMeasurer; terminal?: TerminalInfo; prompts?: PromptPort };

function outputReport(report: InstallReport, json: boolean): number {
  if (json) {
    renderJsonOutput(report);
  } else {
    renderInstallText(report);
  }
  return report.exitCode;
}

function previewReport(result: InstallationResult, findings: readonly DiagnosticFinding[]): InstallReport {
  return buildInstallReport({ command: 'init', mode: 'dry_run', detections: result.detections, plan: result.plan, outcomes: [], findings });
}

const CONFIRMATION_MESSAGE = 'Apply ContextBrake installation plan?';

async function confirmApply(args: ParsedInitArgs, requiresConfirmation: boolean, prompts: PromptPort | null): Promise<boolean> {
  if (prompts === null) return authorizeWrite(args.yes, requiresConfirmation, CONFIRMATION_MESSAGE);
  const confirmed = !requiresConfirmation || await confirmWithPort(prompts, CONFIRMATION_MESSAGE);
  if (!confirmed) printNothingWritten();
  return confirmed;
}

async function executeInit(args: ParsedInitArgs, env: CommandEnv, prompts: PromptPort | null): Promise<number> {
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
  const findings = [...result.findings, ...(args.noAutoRestart ? await keptHandoffFindings(env.projectRoot) : [])];
  if (args.dryRun) return outputReport(previewReport(result, findings), args.json);
  if (prompts !== null) renderInstallText(previewReport(result, findings));
  if (!await confirmApply(args, result.plan.requiresConfirmation, prompts)) return 0;
  const applyReport = await new NodeChangeApplier().apply(result.plan);
  return outputReport(buildInstallReport({ command: 'init', mode: 'applied', detections: result.detections, plan: result.plan, outcomes: applyReport.outcomes, findings }), args.json);
}

async function runAssisted(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const prompts = env.prompts ?? await createPromptPort();
  prompts.begin?.();
  try {
    const assisted = await resolveAssistedArgs(args, env, prompts);
    if (assisted === null) {
      printNothingWritten();
      return 0;
    }
    return await executeInit(assisted, env, prompts);
  } finally {
    if (prompts instanceof ReadlinePromptPort) prompts.close();
  }
}

export async function runInit(args: ParsedInitArgs, env: CommandEnv): Promise<number> {
  const terminal = env.terminal ?? detectTerminal();
  assertTerminalForAssistant(args, terminal);
  return shouldRunAssistant(args, terminal) ? runAssisted(args, env) : executeInit(args, env, null);
}
