import type { HarnessAdapter, HarnessContext } from '../contracts/adapter.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding, DoctorReport, HarnessDiagnostic, OverheadMeasurer } from '../contracts/diagnostics.js';
import type { FileSnapshot } from '../contracts/changes.js';
import { type CapabilityProfile, type DetectionSources, type HarnessId } from '../contracts/harness.js';
import type { InstallationManifest } from '../contracts/manifest.js';
import { assetCurrencyFindings } from './asset-currency.js';
import { brakeSessionFindings, type RuntimeStateReading } from './brake-session-checks.js';
import { detectHarnesses } from './detection-service.js';
import { checkConfig, checkInstructionFiles, checkProtocolFile, checkStateFiles } from './doctor-checks.js';
import { checkpointModeReport, delegatedSnapshotFindings } from './delegated-diagnostics.js';
import { checkGitignore } from './gitignore-checks.js';
import { buildDoctorReport } from './report-service.js';

export type DoctorInput = {
  projectRoot: string;
  config: ContextBrakeConfig | null;
  configError?: Error | null;
  adapters: readonly HarnessAdapter[];
  context: HarnessContext;
  sources: Partial<DetectionSources>;
  explicitHarnesses?: readonly HarnessId[];
  measurer?: OverheadMeasurer;
  instructionSnapshots: readonly FileSnapshot[];
  protocolSnapshot: FileSnapshot;
  gitignoreSnapshot: FileSnapshot;
  planSnapshot?: FileSnapshot;
  checkpointSnapshot?: FileSnapshot;
  manifest: InstallationManifest | null;
  allSnapshots: readonly FileSnapshot[];
  packageVersion: string;
  runtimeState?: RuntimeStateReading | null; contextWindow?: DoctorReport['contextWindow'];
};

function deriveIntegrationState(findings: readonly DiagnosticFinding[]): 'installed' | 'missing' | 'broken' {
  if (findings.some((f) => f.code === 'INTEGRATION_MISSING')) return 'missing';
  if (findings.some((f) => f.code === 'INVALID_HARNESS_CONFIG' || f.code === 'ASSET_MISSING')) return 'broken';
  return 'installed';
}

function unverifiedFloorFinding(harness: HarnessId, support: CapabilityProfile): DiagnosticFinding | null {
  if (support.minimumVersion !== null) return null;
  return {
    code: 'VERSION_FLOOR_UNVERIFIED', severity: 'warning', scope: 'harness', harness, path: null,
    message: `The minimum verified version for ${harness} is unknown, so version compatibility cannot be verified.`,
    impact: `ContextBrake cannot guarantee that the detected ${harness} version supports the registered integration mechanisms.`,
    remediation: 'Confirm the installed harness version and update ContextBrake once the adapter documents a verified minimum version.',
  };
}

async function diagnoseHarness(adapter: HarnessAdapter, input: DoctorInput): Promise<{ diagnostic: HarnessDiagnostic; findings: readonly DiagnosticFinding[] }> {
  const assetFindings = await assetCurrencyFindings(adapter, { context: input.context, manifest: input.manifest, allSnapshots: input.allSnapshots, packageVersion: input.packageVersion });
  const findings = [...(await adapter.diagnose(input.context)), ...assetFindings];
  const version = input.sources[adapter.id]?.version;
  const support = adapter.capabilityProfile(version);
  const floor = unverifiedFloorFinding(adapter.id, support);
  if (floor) findings.push(floor);
  const state = deriveIntegrationState(findings);
  let overhead = null;
  if (state === 'installed' && input.measurer) {
    try { overhead = await input.measurer.measure(adapter.id); } catch { overhead = null; }
  }
  const diagnostic: HarnessDiagnostic = {
    harness: adapter.id, state, version: version?.normalized ?? null,
    support: { ...support, capabilities: [...support.capabilities], limitations: [...support.limitations] },
    overhead,
  };
  return { diagnostic, findings };
}

export async function diagnoseProject(input: DoctorInput): Promise<DoctorReport> {
  const { effective, findings: cfgFindings } = checkConfig(input.config, input.configError);
  const allFindings: DiagnosticFinding[] = [...cfgFindings];
  const selection = input.explicitHarnesses ? { include: input.explicitHarnesses } : {};
  const detections = detectHarnesses(input.sources, selection);
  const hasProject = detections.some((d) => d.state === 'project');
  if (!hasProject && (!input.explicitHarnesses || input.explicitHarnesses.length === 0)) {
    allFindings.push({
      code: 'NO_PROJECT_HARNESS', severity: 'warning', scope: 'project', harness: null, path: null,
      message: 'No project harness was detected.', impact: null, remediation: 'Select one with --harness <id>.',
    });
  }
  const targetIds = new Set<HarnessId>([...(input.config?.activeHarnesses ?? []), ...(input.explicitHarnesses ?? [])]);
  if (targetIds.size === 0) for (const d of detections) if (d.state === 'project') targetIds.add(d.harness);
  const integrations: HarnessDiagnostic[] = [];
  for (const id of targetIds) {
    const adapter = input.adapters.find((a) => a.id === id);
    if (!adapter) continue;
    const { diagnostic, findings } = await diagnoseHarness(adapter, input);
    integrations.push(diagnostic);
    allFindings.push(...findings);
  }
  allFindings.push(...checkInstructionFiles(input.instructionSnapshots));
  allFindings.push(...checkProtocolFile(input.protocolSnapshot, effective));
  allFindings.push(...checkStateFiles(input.planSnapshot, input.checkpointSnapshot));
  if (input.config && !input.configError) allFindings.push(...checkGitignore(input.gitignoreSnapshot, input.config));
  if (input.runtimeState) allFindings.push(...brakeSessionFindings(input.runtimeState));
  allFindings.push(...delegatedSnapshotFindings(input.config, [...targetIds]));
  return buildDoctorReport({ detections, integrations, findings: allFindings, checkpointMode: checkpointModeReport(input.config, input.planSnapshot?.exists ?? false), contextWindow: targetIds.has('claude-code') ? input.contextWindow : undefined });
}
