import { resolve } from 'node:path';
import type { ParsedDoctorArgs } from '../argument-parser.js';
import type { CommandEnv } from './init.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import type { DiagnosticFinding } from '../../core/contracts/diagnostics.js';
import { ProjectConfigStore } from '../../infrastructure/storage/project-config-store.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { NodeOverheadMeasurer } from '../../infrastructure/diagnostics/overhead-measurer.js';
import { readPackageVersion } from '../../infrastructure/storage/package-metadata.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { systemClock } from '../../infrastructure/runtime/runtime-composition.js';
import { NodeRuntimeStateReader } from '../../infrastructure/runtime/runtime-state-reader.js';
import { diagnoseProject } from '../../core/services/doctor-service.js';
import { readClaudeContextWindow } from '../../infrastructure/harnesses/claude-code/statusline-context-window.js';
import { renderJsonOutput } from '../output/json.js';
import { renderDoctorText } from '../output/text.js';
import { collectProjectSnapshots } from '../snapshot-helper.js';
import { buildHarnessContext, collectHarnessSources } from '../detection-collector.js';
import { doctorRestartFindings } from '../handoff-findings.js';

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

export async function runDoctor(args: ParsedDoctorArgs, env: CommandEnv): Promise<number> {
  const { config, configError } = await readConfigSafely(env.projectRoot);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const allSnapshots = await collectProjectSnapshots(env.projectRoot);
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest, { autoRestart: config?.autoRestart !== undefined });
  const sources = await collectHarnessSources(adapters, ctx);
  const measurer = env.overheadMeasurer ?? new NodeOverheadMeasurer(env.projectRoot);
  const packageVersion = await readPackageVersion();
  const diagnosed = await diagnoseProject({
    projectRoot: env.projectRoot, config, configError, adapters, context: ctx, sources,
    ...(args.harness.length > 0 ? { explicitHarnesses: args.harness } : {}), measurer,
    manifest, allSnapshots, packageVersion, contextWindow: await readClaudeContextWindow(env.projectRoot),
    runtimeState: await new NodeRuntimeStateReader(env.projectRoot, systemClock).read(), now: systemClock.now(),
  });
  const installed = adapters.filter((adapter) => !reportsRestart(diagnosed.findings, adapter.id) && diagnosed.integrations.some((integration) => integration.harness === adapter.id && integration.state === 'installed'));
  const report = { ...diagnosed, findings: [...diagnosed.findings, ...await doctorRestartFindings(env.projectRoot, config, installed)] };
  if (args.json) {
    renderJsonOutput(report);
  } else {
    renderDoctorText(report);
  }
  return report.exitCode;
}
