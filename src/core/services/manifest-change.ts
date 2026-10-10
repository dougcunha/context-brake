import { resolve } from 'node:path';
import type { FileSnapshot, PlannedChange } from '../contracts/changes.js';
import { MANIFEST_RELATIVE_PATH, type ConfigOrigin, type InstallationManifest, type ManagedAsset, type ManagedEntry } from '../contracts/manifest.js';

export type ManifestChangeInput = {
  root: string;
  assets: readonly ManagedAsset[];
  entries: readonly ManagedEntry[];
  configOrigins?: readonly ConfigOrigin[] | undefined;
  prev: InstallationManifest | null;
  pkgVer: string;
  snapshot?: FileSnapshot | null | undefined;
};

export function planManifestChange(input: ManifestChangeInput): PlannedChange {
  const origins = input.configOrigins ?? [];
  const manifest: InstallationManifest = { schemaVersion: 1, packageVersion: input.pkgVer, assets: input.assets, entries: input.entries, ...(origins.length > 0 ? { configOrigins: origins } : {}) };
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
