import { resolve } from 'node:path';
import type { ParsedDoctorArgs } from '../argument-parser.js';
import type { CommandEnv } from './init.js';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
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

async function readConfigSafely(root: string): Promise<{ config: ContextBrakeConfig | null; configError: Error | null }> {
  const store = new ProjectConfigStore(resolve(root, 'context-brake.config.json'));
  try {
    const config = await store.read();
    return { config, configError: null };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { config: null, configError: null };
    return { config: null, configError: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function runDoctor(args: ParsedDoctorArgs, env: CommandEnv): Promise<number> {
  const { config, configError } = await readConfigSafely(env.projectRoot);
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const allSnapshots = await collectProjectSnapshots(env.projectRoot, config);
  const protocolSnap = allSnapshots.find((s) => s.path === (config?.instructionFiles.protocolFile ?? 'docs/context-brake-protocol.md'))!;
  const gitignoreSnap = allSnapshots.find((s) => s.path === '.gitignore')!;
  const instTargets = config?.instructionFiles.targets ?? ['CLAUDE.md', 'AGENTS.md'];
  const instSnaps = allSnapshots.filter((s) => instTargets.includes(s.path));
  const planSnap = allSnapshots.find((s) => s.path === (config?.stateStorage.planFile ?? 'task_plan.json'));
  const checkpointSnap = allSnapshots.find((s) => s.path === (config?.stateStorage.checkpointFile ?? 'state_checkpoint.json'));
  const adapters = getAllAdapters();
  const ctx = buildHarnessContext(env, manifest);
  const sources = await collectHarnessSources(adapters, ctx);
  const measurer = new NodeOverheadMeasurer(env.projectRoot);
  const packageVersion = await readPackageVersion();
  const report = await diagnoseProject({
    projectRoot: env.projectRoot, config, configError, adapters, context: ctx, sources,
    ...(args.harness.length > 0 ? { explicitHarnesses: args.harness } : {}), measurer,
    instructionSnapshots: instSnaps, protocolSnapshot: protocolSnap, gitignoreSnapshot: gitignoreSnap,
    ...(planSnap ? { planSnapshot: planSnap } : {}), ...(checkpointSnap ? { checkpointSnapshot: checkpointSnap } : {}),
    manifest, allSnapshots, packageVersion, contextWindow: await readClaudeContextWindow(env.projectRoot),
    runtimeState: await new NodeRuntimeStateReader(env.projectRoot, systemClock).read(),
  });
  if (args.json) {
    renderJsonOutput(report);
  } else {
    renderDoctorText(report);
  }
  return report.exitCode;
}
