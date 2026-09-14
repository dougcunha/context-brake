import { z } from 'zod';
import { HARNESS_IDS, type HarnessId } from './harness.js';
import type { FileSnapshot, PlannedChange } from './changes.js';

export const MANIFEST_SCHEMA_VERSION = 1 as const;
export const MANIFEST_RELATIVE_PATH = '.context-brake/manifest.json' as const;

export type ManagedAsset = {
  path: string;
  kind: string;
  sha256: string;
};

export type ManagedEntry = {
  harness: HarnessId;
  path: string;
  identity: string;
};

export type InstallationManifest = {
  schemaVersion: 1;
  packageVersion: string;
  assets: readonly ManagedAsset[];
  entries: readonly ManagedEntry[];
};

export interface ManifestStore {
  load(): Promise<InstallationManifest | null>;
  save(manifest: InstallationManifest): Promise<void>;
  delete(): Promise<void>;
  planSave(manifest: InstallationManifest, previous: InstallationManifest | null, snapshot?: FileSnapshot | null | undefined): PlannedChange;
}

export const managedAssetSchema = z.object({
  path: z.string(),
  kind: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const managedEntrySchema = z.object({
  harness: z.enum(HARNESS_IDS),
  path: z.string(),
  identity: z.string().min(1),
}).strict();

export const installationManifestSchema = z.object({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  packageVersion: z.string().min(1),
  assets: z.array(managedAssetSchema),
  entries: z.array(managedEntrySchema),
}).strict();
