import { resolve } from 'node:path';
import type { CommandEnv } from './init-flow.js';
import type { ContextBrakeConfig } from '../core/contracts/configuration.js';
import type { DiagnosticFinding, DoctorReport } from '../core/contracts/diagnostics.js';
import type { HarnessId } from '../core/contracts/harness.js';
import { ProjectConfigStore } from '../infrastructure/storage/project-config-store.js';
import { NodeManifestStore } from '../infrastructure/storage/manifest-store.js';
import { NodeOverheadMeasurer } from '../infrastructure/diagnostics/overhead-measurer.js';
import { readPackageVersion } from '../infrastructure/storage/package-metadata.js';
import { getAllAdapters } from '../infrastructure/harnesses/registry.js';
import { resolveSkillInvocation } from '../infrastructure/harnesses/skill-invocations.js';
import { systemClock } from '../infrastructure/runtime/runtime-composition.js';
import { NodeRuntimeStateReader } from '../infrastructure/runtime/runtime-state-reader.js';
import { diagnoseProject } from '../core/services/doctor-service.js';
import { assignFixGroups } from '../core/services/fix-groups.js';
import { readClaudeContextWindow } from '../infrastructure/harnesses/claude-code/statusline-context-window.js';
import { collectProjectSnapshots } from './snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from './detection-collector.js';
import { doctorRestartFindings } from './handoff-findings.js';

export type DoctorDiagnosis = { readonly report: DoctorReport; readonly now: Date; readonly isInstalled: boolean };

async function readConfigSafely(root: string): Promise<{ config: ContextBrakeConfig | null; configError: Error | null }> {
  const store = new ProjectConfigStore(resolve(root, 'context-brake.config.json'));
  try {
    const config = await store.read();
    return { config, configError: null };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { config: null, configError: null };
    const repaired = await store.readTolerant().then((result) => result.config, () => null);
    return { config: repaired, configError: err instanceof Error ? err : new Error(String(err)) };
  }
}

function reportsRestart(findings: readonly DiagnosticFinding[], harness: string): boolean {
  return findings.some((finding) => finding.harness === harness && finding.code.startsWith('AUTO_RESTART'));
}

export async function diagnoseDoctor(env: CommandEnv, harness: readonly HarnessId[]): Promise<DoctorDiagnosis> {
  const { config, configError } = await readConfigSafely(env.projectRoot);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest, { autoRestart: config?.autoRestart !== undefined });
  const now = systemClock.now();
  const diagnosed = await diagnoseProject({
    projectRoot: env.projectRoot, config, configError, adapters, context: ctx, sources: await collectHarnessSources(adapters, ctx),
    ...(harness.length > 0 ? { explicitHarnesses: harness } : {}), measurer: env.overheadMeasurer ?? new NodeOverheadMeasurer(env.projectRoot),
    manifest, allSnapshots: await collectProjectSnapshots(env.projectRoot), packageVersion: await readPackageVersion(), contextWindow: await readClaudeContextWindow(env.projectRoot),
    runtimeState: await new NodeRuntimeStateReader(env.projectRoot, systemClock).read(), now, invocations: resolveSkillInvocation,
  });
  const installed = adapters.filter((adapter) => !reportsRestart(diagnosed.findings, adapter.id) && diagnosed.integrations.some((integration) => integration.harness === adapter.id && integration.state === 'installed'));
  const findings = [...diagnosed.findings, ...await doctorRestartFindings(env.projectRoot, config, installed)];
  const isInstalled = config !== null || configError !== null || manifest !== null;
  return { report: { ...diagnosed, findings: assignFixGroups(findings, adapters) }, now, isInstalled };
}
