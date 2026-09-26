import { existsSync } from 'node:fs';
import { appendFile, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const RUNTIME_ASSET_DIR = 'dist/assets/runtime';
const PROCESS_HOOK_ASSET = 'claude-code-hook.mjs';
const RUNTIME_ASSET_COUNT = 10;
const STALE_MARKER = '\n// stale marker\n';

async function describeRuntimeAssets(): Promise<string> {
  if (!existsSync(RUNTIME_ASSET_DIR)) return 'absent';
  const names = [...(await readdir(RUNTIME_ASSET_DIR))].sort();
  const details = await Promise.all(names.map(async (name) => {
    const info = await stat(join(RUNTIME_ASSET_DIR, name));
    return `${name}:${info.size}:${info.mtimeMs}`;
  }));
  return details.join('|');
}

describe('T18/OBS-01: importing the asset bundler has no side effects', () => {
  it('leaves built runtime assets untouched when the module is imported', async () => {
    const before = await describeRuntimeAssets();
    const bundler = await import('../../scripts/asset-bundler.js');
    expect(bundler.ASSET_ENTRIES).toHaveLength(RUNTIME_ASSET_COUNT);
    expect(await describeRuntimeAssets()).toBe(before);
  });
});

describe('T18/OBS-02: stale runtime assets are detected without being rebuilt', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t18-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('reports a modified asset and leaves the modification in place', async () => {
    const { ASSET_ENTRIES, buildRuntimeAssets, findStaleAssets } = await import('../../scripts/asset-bundler.js');
    const entries = ASSET_ENTRIES.filter((entry) => entry.destination.endsWith(PROCESS_HOOK_ASSET));
    await buildRuntimeAssets(root, entries);
    expect(await findStaleAssets(root, entries)).toEqual([]);
    const target = join(root, entries[0]?.destination ?? '');
    await appendFile(target, STALE_MARKER, 'utf8');
    expect(await findStaleAssets(root, entries)).toEqual([entries[0]?.destination]);
    expect(await readFile(target, 'utf8')).toContain(STALE_MARKER);
  });

  it('rejects missing assets with the file names and the corrective command', async () => {
    const { verifyAssets } = await import('../../scripts/asset-bundler.js');
    await expect(verifyAssets(root)).rejects.toThrow(/claude-code-hook\.mjs.*npm run build/);
  });
});
