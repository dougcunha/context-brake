import { resolve } from 'node:path';
import { DEFAULT_CONFIG, type ContextBrakeConfig, type HarnessId } from '../contracts/configuration.js';
import type { FileSnapshot, PlannedChange } from '../contracts/changes.js';
import { applyDelegatedSnapshot, type DelegatedSnapshotUpdate } from './delegated-snapshot-merge.js';
import { MANIFEST_RELATIVE_PATH, type InstallationManifest, type ManagedAsset, type ManagedEntry } from '../contracts/manifest.js';

const KEEP: DelegatedSnapshotUpdate = { kind: 'keep' };
const CONFIG_SUMMARY = 'Configure ContextBrake active harnesses and zones';

export type ConfigChangeInput = {
  root: string;
  current: ContextBrakeConfig | null;
  active: readonly HarnessId[];
  snapshot?: FileSnapshot | null | undefined;
  delegatedSnapshot?: DelegatedSnapshotUpdate | undefined;
};

export function planConfigChange(
  rootOrInput: string | ConfigChangeInput,
  current?: ContextBrakeConfig | null,
  active?: readonly HarnessId[],
): { config: ContextBrakeConfig; change: PlannedChange } {
  const root = typeof rootOrInput === 'string' ? rootOrInput : rootOrInput.root;
  const curr = typeof rootOrInput === 'string' ? (current ?? null) : rootOrInput.current;
  const act = typeof rootOrInput === 'string' ? (active ?? []) : rootOrInput.active;
  const snap = typeof rootOrInput === 'string' ? null : rootOrInput.snapshot;
  const merged = Array.from(new Set([...(curr?.activeHarnesses ?? []), ...act])).sort();
  const update = typeof rootOrInput === 'string' ? KEEP : rootOrInput.delegatedSnapshot ?? KEEP;
  const config: ContextBrakeConfig = applyDelegatedSnapshot(curr ? { ...curr, activeHarnesses: merged } : { ...DEFAULT_CONFIG, activeHarnesses: merged }, update);
  const content = `${JSON.stringify(config, null, 2)}\n`;
  const defaultPath = resolve(root, 'context-brake.config.json').replace(/\\/g, '/');
  const realPath = (snap?.realPath ?? defaultPath).replace(/\\/g, '/');
  const change: PlannedChange = {
    path: 'context-brake.config.json',
    realPath,
    kind: curr ? 'update' : 'create',
    owner: 'config',
    content,
    preview: { summary: update.kind === 'keep' ? CONFIG_SUMMARY : `${CONFIG_SUMMARY}; ${update.kind === 'set' ? 'set' : 'remove'} the delegated snapshot section` },
  };
  return { config, change };
}

export type ManifestChangeInput = {
  root: string;
  assets: readonly ManagedAsset[];
  entries: readonly ManagedEntry[];
  prev: InstallationManifest | null;
  pkgVer: string;
  snapshot?: FileSnapshot | null | undefined;
};

export function planManifestChange(input: ManifestChangeInput): PlannedChange {
  const manifest: InstallationManifest = { schemaVersion: 1, packageVersion: input.pkgVer, assets: input.assets, entries: input.entries };
  const content = `${JSON.stringify(manifest, null, 2)}\n`;
  const defaultPath = resolve(input.root, MANIFEST_RELATIVE_PATH).replace(/\\/g, '/');
  const realPath = (input.snapshot?.realPath ?? defaultPath).replace(/\\/g, '/');
  return {
    path: MANIFEST_RELATIVE_PATH,
    realPath,
    kind: input.prev ? 'update' : 'create',
    owner: 'manifest',
    content,
    preview: { summary: 'Record installation manifest with managed assets and entries' },
  };
}
