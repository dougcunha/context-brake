import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { installationManifestSchema, type InstallationManifest } from '../../src/core/contracts/manifest.js';
import { NodeManifestStore } from '../../src/infrastructure/storage/manifest-store.js';

const sampleManifest: InstallationManifest = {
  schemaVersion: 1,
  packageVersion: '1.0.0',
  assets: [{ path: '.claude/hooks/context-brake.mjs', kind: 'runtime_asset', sha256: 'a'.repeat(64) }],
  entries: [{ harness: 'claude-code', path: '.claude/settings.json', identity: 'PreToolUse|*|.claude/hooks/context-brake.mjs' }],
};

describe('installation manifest schema and planning (RF19, CA-12)', () => {
  it('validates schema-compliant manifest records', () => {
    const validated = installationManifestSchema.parse(sampleManifest);
    expect(validated.assets).toHaveLength(1);
    expect(validated.entries).toHaveLength(1);
  });

  it('plans create and update changes for manifest persistence', () => {
    const store = new NodeManifestStore('/repo');
    const createPlan = store.planSave(sampleManifest, null);
    expect(createPlan.kind).toBe('create');
    expect(createPlan.owner).toBe('manifest');
    expect(createPlan.path).toBe('.context-brake/manifest.json');
    const updatePlan = store.planSave(sampleManifest, sampleManifest);
    expect(updatePlan.kind).toBe('update');
  });
});

describe('installation manifest filesystem operations (RF19, CA-12)', () => {
  it('persists, reads back, and deletes manifest on filesystem', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-manifest-'));
    try {
      const store = new NodeManifestStore(dir);
      expect(await store.load()).toBeNull();
      await store.save(sampleManifest);
      const loaded = await store.load();
      expect(loaded).toEqual(sampleManifest);
      await store.delete();
      expect(await store.load()).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
