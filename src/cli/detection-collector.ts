import type { HarnessAdapter, HarnessContext } from '../core/contracts/adapter.js';
import type { DetectionInput, DetectionSources, VersionProbe } from '../core/contracts/harness.js';
import type { ProcessRunner } from '../core/contracts/processes.js';
import type { InstallationManifest } from '../core/contracts/manifest.js';

export async function collectHarnessSources(adapters: readonly HarnessAdapter[], ctx: HarnessContext): Promise<Partial<DetectionSources>> {
  const sources: Record<string, DetectionInput> = {};
  for (const adapter of adapters) {
    const evidence = await adapter.detect(ctx);
    const hasProject = evidence.some((e) => e.origin === 'project');
    const hasMachine = evidence.some((e) => e.origin === 'machine');
    let version: VersionProbe | undefined;
    if (hasProject || hasMachine) {
      try {
        version = await adapter.probeVersion(ctx);
      } catch {
        version = undefined;
      }
    }
    const project = evidence.filter((e) => e.origin === 'project');
    const machine = evidence.filter((e) => e.origin === 'machine');
    sources[adapter.id] = { project, machine, ...(version ? { version } : {}) };
  }
  return sources as Partial<DetectionSources>;
}

export function buildHarnessContext(env: { projectRoot: string; runner?: ProcessRunner; userHome?: string }, manifest?: InstallationManifest | null): HarnessContext {
  return {
    projectRoot: env.projectRoot,
    ...(env.runner ? { runner: env.runner } : {}),
    ...(env.userHome ? { userHome: env.userHome } : {}),
    ...(manifest !== undefined ? { manifest } : {}),
  };
}
