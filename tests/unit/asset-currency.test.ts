import { describe, expect, it } from 'vitest';
import { classifyAssetCurrency, protectModifiedAssets } from '../../src/core/services/asset-currency.js';
import { hashString } from '../../src/core/services/change-plan-service.js';
import type { FileSnapshot, PlannedChange } from '../../src/core/contracts/changes.js';
import type { InstallationManifest } from '../../src/core/contracts/manifest.js';

describe('classifyAssetCurrency (FR-08, TC-03)', () => {
  it.each([
    { installed: 'a', manifest: 'a', expected: 'a', currency: 'current' },
    { installed: 'a', manifest: 'a', expected: 'b', currency: 'outdated' },
    { installed: 'c', manifest: 'a', expected: 'b', currency: 'modified' },
  ])('classifies installed $installed with manifest $manifest and expected $expected as $currency', ({ installed, manifest, expected, currency }) => {
    expect(classifyAssetCurrency(installed, manifest, expected)).toBe(currency);
  });
});

describe('protectModifiedAssets with overwritePaths (prd-24 DEC-04, TC-06)', () => {
  const content = '// installed by ContextBrake\n';
  const change: PlannedChange = { path: 'hook.mjs', realPath: '/repo/hook.mjs', kind: 'create', owner: 'runtime_asset', content, preview: { summary: 'Install hook' } };
  const manifest = { schemaVersion: 1, packageVersion: '1.0.0', entries: [], assets: [{ path: 'hook.mjs', sha256: hashString('// older\n') }] } as unknown as InstallationManifest;
  const snapshots: FileSnapshot[] = [{ path: 'hook.mjs', exists: true, sha256: hashString('// edited by the user\n') } as FileSnapshot];

  it('turns a modified asset into a conflict by default', () => {
    const protection = protectModifiedAssets([change], { manifest, snapshots });
    expect([protection.changes, protection.conflicts.map((conflict) => conflict.code)]).toEqual([[], ['MODIFIED_OWNED_ASSET']]);
  });
  it('keeps the change when the path is allowed to be overwritten', () => {
    const protection = protectModifiedAssets([change], { manifest, snapshots, overwritePaths: new Set(['hook.mjs']) });
    expect([protection.changes, protection.conflicts]).toEqual([[change], []]);
  });
});
