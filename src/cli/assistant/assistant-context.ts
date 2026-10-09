import type { ProcessRunner } from '../../core/contracts/processes.js';
import { detectHarnesses } from '../../core/services/detection-service.js';
import { getAllAdapters } from '../../infrastructure/harnesses/registry.js';
import { hasStatuslineOptOut } from '../../infrastructure/harnesses/claude-code/statusline-default.js';
import { isInsideGitWorkingTree } from '../../infrastructure/git/git-context.js';
import { NodeManifestStore } from '../../infrastructure/storage/manifest-store.js';
import { buildHarnessContext, collectHarnessSources } from '../detection-collector.js';
import type { InitConfigState } from '../init-config-state.js';
import type { AssistantContext } from './types.js';

export type AssistantEnv = { projectRoot: string; runner?: ProcessRunner; userHome?: string };

export async function buildAssistantContext(env: AssistantEnv, state: Pick<InitConfigState, 'config' | 'selection'>): Promise<AssistantContext> {
  const adapters = getAllAdapters();
  const manifest = await new NodeManifestStore(env.projectRoot).load();
  const sources = await collectHarnessSources(adapters, buildHarnessContext(env, manifest));
  return {
    config: state.config,
    detections: detectHarnesses(sources, state.selection),
    adapters,
    hasStatuslineOptOut: await hasStatuslineOptOut(env.projectRoot),
    insideGit: await isInsideGitWorkingTree(env.projectRoot),
  };
}
