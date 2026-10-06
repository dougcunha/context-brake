import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod/mini';
import type { PlannedChange } from '../../../core/contracts/changes.js';
import { resolveChangeTarget } from '../common/change-target.js';
import { pathExists } from '../common/path-helpers.js';
import { CLAUDE_LOCAL_SETTINGS_FILE } from './statusline-settings.js';
import { readStatuslineState } from './statusline-state.js';

export const MOD_OWNERSHIP_FILE = '.context-brake/runtime/claude-mod-install.json';

const ownershipSchema = z.strictObject({ v: z.literal(1), createdLocalFile: z.boolean() });

async function readCreatedLocalFile(root: string): Promise<boolean | null> {
  const content = await readFile(resolve(root, MOD_OWNERSHIP_FILE), 'utf8').catch(() => null);
  if (content === null) return null;
  try {
    const result = ownershipSchema.safeParse(JSON.parse(content));
    return result.success ? result.data.createdLocalFile : null;
  } catch {
    return null;
  }
}

async function isCreatedByBridge(root: string): Promise<boolean> {
  return (await readStatuslineState(root))?.createdLocalFile === true;
}

export async function isLocalSettingsOwned(root: string): Promise<boolean> {
  return (await readCreatedLocalFile(root)) === true || isCreatedByBridge(root);
}

async function createdLocalFile(root: string): Promise<boolean> {
  if ((await readCreatedLocalFile(root)) === true) return true;
  return !(await pathExists(resolve(root, CLAUDE_LOCAL_SETTINGS_FILE))) || isCreatedByBridge(root);
}

export async function ownershipRecord(root: string): Promise<PlannedChange> {
  const content = `${JSON.stringify({ v: 1, createdLocalFile: await createdLocalFile(root) }, null, 2)}\n`;
  return { path: MOD_OWNERSHIP_FILE, realPath: await resolveChangeTarget(root, MOD_OWNERSHIP_FILE), kind: 'update', owner: 'harness_entry', content, preview: { summary: 'Record who created the local settings' } };
}

export async function ownershipRemoval(root: string): Promise<PlannedChange[]> {
  if (!(await pathExists(resolve(root, MOD_OWNERSHIP_FILE)))) return [];
  return [{ path: MOD_OWNERSHIP_FILE, realPath: await resolveChangeTarget(root, MOD_OWNERSHIP_FILE), kind: 'delete', owner: 'harness_entry', content: null, preview: { summary: 'Delete the automatic restart ownership record' } }];
}
