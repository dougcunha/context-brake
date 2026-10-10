import { access, mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeHandoffStore } from '../../src/infrastructure/storage/node-handoff-store.js';

const AT = new Date('2026-10-07T12:00:00.000Z');
const clock = { now: () => AT };
const CONCURRENT_PAIRS = 100;
const STALE_LOCK_MS = 30_000;
const LOCK = join('.context-brake', 'handoffs', '.claim.lock');
const ARCHIVED = '20261007T120000.000Z.md';

async function writeHandoff(root: string): Promise<void> {
  await mkdir(join(root, '.context-brake', 'handoffs'), { recursive: true });
  await writeFile(join(root, '.context-brake', 'handoff.md'), 'once', 'utf8');
}

async function claimPair(root: string): Promise<string[]> {
  await writeHandoff(root);
  const results = await Promise.all([new NodeHandoffStore(root, clock).claim(), new NodeHandoffStore(root, clock).claim()]);
  return results.filter((path): path is string => path !== null);
}

let base: string;
beforeEach(async () => { base = await mkdtemp(join(tmpdir(), 'cb-handoff-lock-')); });
afterEach(async () => { await rm(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('NodeHandoffStore claim lock (prd-14 FR-03, NFR-02, TC-03, codereview_02 CR-01)', () => {
  it('delivers each handoff once across many sequential concurrent claim pairs, to an existing archived file', async () => {
    for (let index = 0; index < CONCURRENT_PAIRS; index += 1) {
      const root = join(base, `pair-${index}`);
      const delivered = await claimPair(root);
      expect(delivered).toHaveLength(1);
      await expect(access(join(root, delivered[0]!))).resolves.toBeUndefined();
      expect(await readdir(join(root, '.context-brake', 'handoffs'))).toHaveLength(1);
    }
  });
  it.each([
    { label: 'respects a lock exactly at the stale limit', lockAgeMs: STALE_LOCK_MS, claimed: null, archive: ['.claim.lock'] },
    { label: 'takes over a lock just past the stale limit, left by a crashed claim', lockAgeMs: STALE_LOCK_MS + 1, claimed: `.context-brake/handoffs/${ARCHIVED}`, archive: [ARCHIVED] },
  ])('$label', async ({ lockAgeMs, claimed, archive }) => {
    await writeHandoff(base);
    await writeFile(join(base, LOCK), '', 'utf8');
    const lockTime = new Date(AT.getTime() - lockAgeMs);
    await utimes(join(base, LOCK), lockTime, lockTime);
    await expect(new NodeHandoffStore(base, clock).claim()).resolves.toBe(claimed);
    expect(await readdir(join(base, '.context-brake', 'handoffs'))).toEqual(archive);
  });
});

describe('NodeHandoffStore claim race (prd-14 FR-03, NFR-02)', () => {
  it('returns null and leaves no reserved archive file when the handoff vanishes before the move', async () => {
    await writeHandoff(base);
    const pending = join(base, '.context-brake', 'handoff.md');
    function removeHandoff(): boolean {
      rmSync(pending);
      return false;
    }
    await expect(new NodeHandoffStore(base, clock).claim({ isExpired: removeHandoff, commit: () => true })).resolves.toBeNull();
    expect(await readdir(join(base, '.context-brake', 'handoffs'))).toEqual([]);
  });
});
