import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installationManifestSchema, MANIFEST_RELATIVE_PATH, type InstallationManifest, type ManifestStore } from '../../core/contracts/manifest.js';
import type { FileSnapshot, PlannedChange } from '../../core/contracts/changes.js';
import { normalizeSeparators } from './path-boundary.js';
import { deleteFileIfExists, writeFileAtomically } from './atomic-writer.js';

export class NodeManifestStore implements ManifestStore {
  readonly manifestPath: string;

  constructor(readonly projectRoot: string) {
    this.manifestPath = resolve(projectRoot, MANIFEST_RELATIVE_PATH);
  }

  async load(): Promise<InstallationManifest | null> {
    try {
      const content = await readFile(this.manifestPath, 'utf8');
      const parsed = JSON.parse(content) as unknown;
      return installationManifestSchema.parse(parsed);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  planSave(manifest: InstallationManifest, previous: InstallationManifest | null, snapshot?: FileSnapshot | null | undefined): PlannedChange {
    const formatted = `${JSON.stringify(manifest, null, 2)}\n`;
    const realPath = snapshot?.realPath ?? normalizeSeparators(this.manifestPath);
    return {
      path: MANIFEST_RELATIVE_PATH,
      realPath,
      kind: previous ? 'update' : 'create',
      owner: 'manifest',
      content: formatted,
      preview: { summary: 'Record installation manifest with managed assets and entries' },
    };
  }

  async save(manifest: InstallationManifest): Promise<void> {
    const validated = installationManifestSchema.parse(manifest);
    const formatted = `${JSON.stringify(validated, null, 2)}\n`;
    await writeFileAtomically(this.manifestPath, formatted);
  }

  async delete(): Promise<void> {
    await deleteFileIfExists(this.manifestPath);
  }
}
