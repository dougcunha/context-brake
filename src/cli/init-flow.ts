import { assertAutoRestartTarget, assertStatuslineBridgeTarget, type ParsedInitArgs } from './init-arguments.js';
import type { ProcessRunner } from '../core/contracts/processes.js';
import type { DiagnosticFinding, InstallReport, OverheadMeasurer } from '../core/contracts/diagnostics.js';
import { NodeChangeApplier } from '../infrastructure/storage/change-applier.js';
import { getAllAdapters } from '../infrastructure/harnesses/registry.js';
import type { InstallationResult } from '../core/services/installation-service.js';
import { planInit, type InitPlanRequest } from './init-plan.js';
import { buildInstallReport } from '../core/services/report-service.js';
import { renderJsonOutput } from './output/json.js';
import { renderInstallText } from './output/install-text.js';
import { authorizeWrite } from './confirmation.js';
import { planConfigUpdates } from './init-config-updates.js';
import { printNothingWritten } from './assistant/assistant-session.js';
import { confirmWithPort, type PromptPort } from './assistant/prompt-port.js';
import type { TerminalInfo } from './terminal.js';

export type CommandEnv = { projectRoot: string; runner?: ProcessRunner; userHome?: string; overheadMeasurer?: OverheadMeasurer; terminal?: TerminalInfo; prompts?: PromptPort };

const CONFIRMATION_MESSAGE = 'Apply ContextBrake installation plan?';

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

async function confirmApply(args: ParsedInitArgs, requiresConfirmation: boolean, prompts: PromptPort | null): Promise<boolean> {
  if (prompts === null) return authorizeWrite(args.yes, requiresConfirmation, CONFIRMATION_MESSAGE);
  const confirmed = !requiresConfirmation || await confirmWithPort(prompts, CONFIRMATION_MESSAGE);
  if (!confirmed) printNothingWritten();
  return confirmed;
}

function planRequest(args: ParsedInitArgs): InitPlanRequest {
  return {
    harness: args.harness, excludeHarness: args.excludeHarness, statuslineBridge: args.statuslineBridge ?? 'default',
    noAutoRestart: args.noAutoRestart === true, configUpdates: (config) => planConfigUpdates(config, args),
  };
}

export async function executeInit(args: ParsedInitArgs, env: CommandEnv, prompts: PromptPort | null): Promise<number> {
  const { result, findings } = await planInit(env, planRequest(args));
  assertStatuslineBridgeTarget(args.statuslineBridge, result.detections);
  assertAutoRestartTarget(args, result.detections, getAllAdapters());
  if (args.dryRun) return outputReport(previewReport(result, findings), args.json);
  if (prompts !== null) renderInstallText(previewReport(result, findings));
  if (!await confirmApply(args, result.plan.requiresConfirmation, prompts)) return 0;
  const applyReport = await new NodeChangeApplier().apply(result.plan);
  return outputReport(buildInstallReport({ command: 'init', mode: 'applied', detections: result.detections, plan: result.plan, outcomes: applyReport.outcomes, findings }), args.json);
}
