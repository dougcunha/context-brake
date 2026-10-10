import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { InstallationManifest } from '../../src/core/contracts/manifest.js';
import { NodeManifestStore } from '../../src/infrastructure/storage/manifest-store.js';

const SAMPLE_MANIFEST: InstallationManifest = {
  schemaVersion: 1,
  packageVersion: '1.0.0',
  assets: [{ path: '.claude/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: 'a'.repeat(64) }],
  entries: [{ harness: 'claude-code', path: '.claude/settings.json', identity: 'PreToolUse|*|.claude/hooks/context-brake.mjs' }],
};

async function withProject(check: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'cb-manifest-'));
  try {
    await check(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('installation manifest store (RF19, CA-12)', () => {
  it('persists, reads back, and deletes manifest on filesystem', async () => {
    await withProject(async (root) => {
      const store = new NodeManifestStore(root);
      expect(await store.load()).toBeNull();
      await store.save(SAMPLE_MANIFEST);
      expect(await store.load()).toEqual(SAMPLE_MANIFEST);
      await store.delete();
      expect(await store.load()).toBeNull();
    });
  });

  it.each([
    { name: 'malformed JSON', content: '{', error: SyntaxError },
    { name: 'an unknown schema version', content: JSON.stringify({ ...SAMPLE_MANIFEST, schemaVersion: 2 }), error: ZodError },
  ])('rejects a manifest with $name instead of reading it as absent', async ({ content, error }) => {
    await withProject(async (root) => {
      const store = new NodeManifestStore(root);
      await mkdir(dirname(store.manifestPath), { recursive: true });
      await writeFile(store.manifestPath, content, 'utf8');
      await expect(store.load()).rejects.toBeInstanceOf(error);
    });
  });
});
