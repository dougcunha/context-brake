import type { AdapterPlan } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import type { ManagedEntry } from '../../../core/contracts/manifest.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { loadRuntimeAsset } from '../common/runtime-assets.js';

export const OPENCODE_PLUGIN_FILE = '.opencode/plugins/context-brake.js';

export function buildOpenCodeEntries(): ManagedEntry[] {
  return [
    { harness: 'opencode', path: OPENCODE_PLUGIN_FILE, identity: `plugin|${OPENCODE_PLUGIN_FILE}` },
  ];
}

export async function planOpenCodeInstall(projectRoot: string): Promise<AdapterPlan> {
  const realPlugin = await resolveChangeTarget(projectRoot, OPENCODE_PLUGIN_FILE);
  const content = await loadRuntimeAsset('opencode-plugin.js');
  const changes: PlannedChange[] = [
    { path: OPENCODE_PLUGIN_FILE, realPath: realPlugin, kind: 'create', owner: 'runtime_asset', content, preview: { summary: 'Install OpenCode plugin' } },
  ];
  return { harness: 'opencode', changes, conflicts: [], entries: buildOpenCodeEntries() };
}

export async function planOpenCodeRemove(projectRoot: string): Promise<AdapterPlan> {
  const realPlugin = await resolveChangeTarget(projectRoot, OPENCODE_PLUGIN_FILE);
  const changes: PlannedChange[] = [
    { path: OPENCODE_PLUGIN_FILE, realPath: realPlugin, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete OpenCode plugin' } },
  ];
  return { harness: 'opencode', changes, conflicts: [], entries: buildOpenCodeEntries() };
}
