import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

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
