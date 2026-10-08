import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HANDOFF_ARCHIVE_LIMIT } from '../../src/core/contracts/handoff.js';
import { NodeHandoffStore } from '../../src/infrastructure/storage/node-handoff-store.js';

const AT = new Date('2026-10-07T12:00:00.000Z');
const clock = { now: () => AT };

async function writeHandoff(root: string, text: string): Promise<void> {
  await mkdir(join(root, '.context-brake'), { recursive: true });
  await writeFile(join(root, '.context-brake', 'handoff.md'), text, 'utf8');
}

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-handoff-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('NodeHandoffStore (prd-14 FR-03, NFR-02, NFR-04, TC-03)', () => {
  it('reports no pending handoff and claims nothing when the file is missing', async () => {
    const store = new NodeHandoffStore(root, clock);
    await expect(store.pendingSince()).resolves.toBeNull();
    await expect(store.claim()).resolves.toBeNull();
  });
  it('moves the handoff to the archive and returns its relative path', async () => {
    await writeHandoff(root, '# goal\n');
    const store = new NodeHandoffStore(root, clock);
    expect(await store.pendingSince()).toEqual(expect.any(Number));
    await expect(store.claim()).resolves.toBe('.context-brake/handoffs/20261007T120000.000Z.md');
    await expect(readFile(join(root, '.context-brake', 'handoffs', '20261007T120000.000Z.md'), 'utf8')).resolves.toBe('# goal\n');
    await expect(store.pendingSince()).resolves.toBeNull();
  });
  it('adds a suffix when a handoff with the same timestamp is already archived', async () => {
    const store = new NodeHandoffStore(root, clock);
    await writeHandoff(root, 'first');
    await store.claim();
    await writeHandoff(root, 'second');
    await expect(store.claim()).resolves.toBe('.context-brake/handoffs/20261007T120000.000Z-1.md');
  });
});

describe('NodeHandoffStore archive (prd-14 FR-03)', () => {
  it('keeps only the most recent archived handoffs', async () => {
    const archive = join(root, '.context-brake', 'handoffs');
    await mkdir(archive, { recursive: true });
    const oldNames = Array.from({ length: HANDOFF_ARCHIVE_LIMIT }, (_, index) => `202609${String(index).padStart(2, '0')}T000000.000Z.md`);
    await Promise.all(oldNames.map((name) => writeFile(join(archive, name), 'old')));
    await writeHandoff(root, 'newest');
    await new NodeHandoffStore(root, clock).claim();
    const names = (await readdir(archive)).sort();
    expect(names).toHaveLength(HANDOFF_ARCHIVE_LIMIT);
    expect(names).not.toContain('20260900T000000.000Z.md');
    expect(names).toContain('20261007T120000.000Z.md');
  });
  it('keeps the handoff it just archived when the clock is behind a full archive (codereview_05 CR-02)', async () => {
    const archive = join(root, '.context-brake', 'handoffs');
    await mkdir(archive, { recursive: true });
    const laterNames = Array.from({ length: HANDOFF_ARCHIVE_LIMIT }, (_, index) => `202712${String(index).padStart(2, '0')}T000000.000Z.md`);
    await Promise.all(laterNames.map((name) => writeFile(join(archive, name), 'later')));
    await writeHandoff(root, 'newest');
    await expect(new NodeHandoffStore(root, clock).claim()).resolves.toBe('.context-brake/handoffs/20261007T120000.000Z.md');
    await expect(readFile(join(archive, '20261007T120000.000Z.md'), 'utf8')).resolves.toBe('newest');
    const names = await readdir(archive);
    expect(names).toHaveLength(HANDOFF_ARCHIVE_LIMIT);
    expect(names).not.toContain('20271200T000000.000Z.md');
  });
});

describe('NodeHandoffStore concurrency (prd-14 TC-03)', () => {
  it('lets only one of two concurrent claims deliver the handoff', async () => {
    await writeHandoff(root, 'once');
    const results = await Promise.all([new NodeHandoffStore(root, clock).claim(), new NodeHandoffStore(root, clock).claim()]);
    const delivered = results.filter((path) => path !== null);
    expect(delivered.length).toBeGreaterThanOrEqual(1);
    const archived = await readdir(join(root, '.context-brake', 'handoffs'));
    expect(archived).toHaveLength(1);
    expect(delivered).toHaveLength(1);
  });
});
