import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { loadRuntimeAsset } from '../../src/infrastructure/harnesses/common/runtime-assets.js';
import { getAdapter, getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

const PROCESS_HOOK_ASSETS: Readonly<[HarnessId, string][]> = [
  ['claude-code', 'claude-code-hook.mjs'],
  ['codex-cli', 'codex-cli-hook.mjs'],
  ['cursor', 'cursor-hook.mjs'],
  ['github-copilot-cli', 'github-copilot-cli-hook.mjs'],
  ['antigravity-cli', 'antigravity-cli-hook.mjs'],
];

describe('harness adapter install and remove planners (RF5, RF6, RF19)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-plan-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('generates valid install plan for every harness adapter', async () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      const plan = await adapter.planInstall({ projectRoot: tempDir });
      expect(plan.harness).toBe(adapter.id);
      expect(plan.conflicts).toHaveLength(0);
      expect(plan.changes.length).toBeGreaterThan(0);
      expect(plan.entries.length).toBeGreaterThan(0);
    }
  });

  it('generates valid remove plan for every harness adapter', async () => {
    const adapters = getAllAdapters();
    for (const adapter of adapters) {
      const plan = await adapter.planRemove({ projectRoot: tempDir });
      expect(plan.harness).toBe(adapter.id);
      expect(plan.conflicts).toHaveLength(0);
      expect(plan.changes.length).toBeGreaterThan(0);
    }
  });
});

describe('process harness hook assets (RF5)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-hook-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it.each(PROCESS_HOOK_ASSETS)('installs the process hook built for %s', async (harness, asset) => {
    const plan = await getAdapter(harness).planInstall({ projectRoot: tempDir });
    const hook = plan.changes.find((change) => change.owner === 'runtime_asset');
    expect(hook?.content).toBe(await loadRuntimeAsset(asset));
  });
});
