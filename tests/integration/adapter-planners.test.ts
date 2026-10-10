import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
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

type NewEventGroup = { readonly harness: HarnessId; readonly events: readonly string[] };

const NEW_EVENTS: readonly NewEventGroup[] = [
  { harness: 'claude-code', events: ['Stop'] },
  { harness: 'codex-cli', events: ['Stop'] },
  { harness: 'cursor', events: ['preCompact'] },
  { harness: 'github-copilot-cli', events: ['preCompact'] },
  { harness: 'antigravity-cli', events: ['PostToolUse'] },
];

async function verifyIdempotentRegistration(tempDir: string, group: NewEventGroup): Promise<void> {
  const plan = await getAdapter(group.harness).planInstall({ projectRoot: tempDir });
  for (const event of group.events) {
    expect(plan.entries.filter((entry) => entry.identity.split('|').includes(event)), `${group.harness} ${event}`).toHaveLength(1);
  }
  const config = plan.changes.find((change) => change.owner === 'harness_entry');
  expect(config?.content).toBeTruthy();
  await mkdir(dirname(config!.realPath), { recursive: true });
  await writeFile(config!.realPath, config!.content!, 'utf8');
  const second = await getAdapter(group.harness).planInstall({ projectRoot: tempDir });
  const third = await getAdapter(group.harness).planInstall({ projectRoot: tempDir });
  const secondContent = second.changes.find((change) => change.owner === 'harness_entry')?.content;
  const thirdContent = third.changes.find((change) => change.owner === 'harness_entry')?.content ?? '';
  expect(thirdContent).toBe(secondContent);
  for (const event of group.events) {
    expect(thirdContent.split(`"${event}":`).length - 1, `${group.harness} ${event} duplicate`).toBe(1);
  }
}

describe('harness adapter install and remove planners (RF5, RF6, RF19)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-plan-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('plans install and remove on a clean project without conflicts for every harness', async () => {
    for (const adapter of getAllAdapters()) {
      const install = await adapter.planInstall({ projectRoot: tempDir });
      const remove = await adapter.planRemove({ projectRoot: tempDir });
      expect([install.harness, remove.harness]).toEqual([adapter.id, adapter.id]);
      expect([...install.conflicts, ...remove.conflicts]).toEqual([]);
      expect([install.changes.length > 0, install.entries.length > 0, remove.changes.length > 0]).toEqual([true, true, true]);
    }
  });

  it('registers each new event once after three installs (TC-26, DEC-13)', async () => {
    for (const group of NEW_EVENTS) await verifyIdempotentRegistration(tempDir, group);
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
