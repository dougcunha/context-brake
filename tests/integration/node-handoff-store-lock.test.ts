import { access, mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeHandoffStore } from '../../src/infrastructure/storage/node-handoff-store.js';

const AT = new Date('2026-10-07T12:00:00.000Z');
const clock = { now: () => AT };
const CONCURRENT_PAIRS = 100;
const LOCK = join('.context-brake', 'handoffs', '.claim.lock');

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
  it('returns null while another claim holds a fresh lock', async () => {
    await writeHandoff(base);
    await writeFile(join(base, LOCK), '', 'utf8');
    await utimes(join(base, LOCK), AT, AT);
    await expect(new NodeHandoffStore(base, clock).claim()).resolves.toBeNull();
  });
  it('takes over a stale lock left by a crashed claim', async () => {
    await writeHandoff(base);
    await writeFile(join(base, LOCK), '', 'utf8');
    const old = new Date(AT.getTime() - 3_600_000);
    await utimes(join(base, LOCK), old, old);
    await expect(new NodeHandoffStore(base, clock).claim()).resolves.toBe('.context-brake/handoffs/20261007T120000.000Z.md');
    expect(await readdir(join(base, '.context-brake', 'handoffs'))).toEqual(['20261007T120000.000Z.md']);
  });
});
