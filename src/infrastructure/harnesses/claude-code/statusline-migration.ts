import { resolve } from 'node:path';
import type { HarnessContext } from '../../../core/contracts/adapter.js';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { pathExists } from '../common/path-helpers.js';
import { planStatuslineOptOut, softenDefaultConflict } from './statusline-default.js';
import { planStatuslineRestore, type StatuslinePlan } from './statusline-restore.js';
import { STATUSLINE_BRIDGE_FILE } from './statusline-settings.js';

async function bridgeScriptDeletion(projectRoot: string): Promise<PlannedChange[]> {
  if (!(await pathExists(resolve(projectRoot, STATUSLINE_BRIDGE_FILE)))) return [];
  const realPath = await resolveChangeTarget(projectRoot, STATUSLINE_BRIDGE_FILE);
  return [{ path: STATUSLINE_BRIDGE_FILE, realPath, kind: 'delete', owner: 'runtime_asset', content: null, preview: { summary: 'Delete the status line bridge script, the mod now reads the context' } }];
}

async function restoration(context: HarnessContext): Promise<StatuslinePlan> {
  if (context.statuslineBridge === 'remove') return planStatuslineOptOut(context.projectRoot);
  return softenDefaultConflict(await planStatuslineRestore(context.projectRoot));
}

export async function planModFirstStatusline(context: HarnessContext): Promise<StatuslinePlan> {
  const restore = await restoration(context);
  if (restore.conflicts.length > 0) return restore;
  return { ...restore, changes: [...restore.changes, ...await bridgeScriptDeletion(context.projectRoot)] };
}
