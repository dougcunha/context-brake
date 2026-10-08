import { resolve } from 'node:path';
import type { ContextBrakeConfig } from '../core/contracts/configuration.js';
import type { DetectionSelection, HarnessId } from '../core/contracts/harness.js';
import { resolveHarnessExclusion } from '../core/services/harness-exclusion.js';
import type { DroppedKey } from '../core/validation/configuration-sanitizer.js';
import { ProjectConfigStore } from '../infrastructure/storage/project-config-store.js';

export type HarnessFlags = { readonly include: readonly HarnessId[]; readonly exclude: readonly HarnessId[] };
export type InitConfigState = {
  config: ContextBrakeConfig | null;
  dropped: readonly DroppedKey[];
  excluded: readonly HarnessId[];
  selection: DetectionSelection;
};

async function readConfig(root: string): Promise<{ config: ContextBrakeConfig | null; dropped: readonly DroppedKey[] }> {
  const store = new ProjectConfigStore(resolve(root, 'context-brake.config.json'));
  try { return await store.readTolerant(); } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { config: null, dropped: [] };
    throw err;
  }
}

export async function loadInitConfigState(root: string, flags: HarnessFlags): Promise<InitConfigState> {
  const { config, dropped } = await readConfig(root);
  const { excluded, selection } = resolveHarnessExclusion({ configured: config?.excludedHarnesses ?? [], include: flags.include, exclude: flags.exclude });
  return { config, dropped, excluded, selection };
}
