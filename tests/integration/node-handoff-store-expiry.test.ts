import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HANDOFF_ARCHIVE_LIMIT } from '../../src/core/contracts/handoff.js';
import type { ClaimDeadline } from '../../src/core/contracts/hook-phase.js';
import { NodeHandoffStore } from '../../src/infrastructure/storage/node-handoff-store.js';

const AT = new Date('2026-10-07T12:00:00.000Z');
const clock = { now: () => AT };
const OLDEST = '20250101T000000.000Z.md';

let root: string;
let archive: string;
let pending: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-handoff-expiry-'));
  archive = join(root, '.context-brake', 'handoffs');
  pending = join(root, '.context-brake', 'handoff.md');
  await mkdir(archive, { recursive: true });
  await writeFile(pending, '# goal\n', 'utf8');
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function fillArchive(): Promise<string[]> {
  const names = Array.from({ length: HANDOFF_ARCHIVE_LIMIT - 1 }, (_, index) => `202609${String(index).padStart(2, '0')}T000000.000Z.md`);
  await Promise.all(names.map((name) => writeFile(join(archive, name), 'old')));
  return [OLDEST, ...names].sort();
}

function expiresAfter(calls: number): ClaimDeadline {
  let seen = 0;
  function isExpired(): boolean {
    seen += 1;
    return seen > calls;
  }
  return { isExpired, commit: () => !isExpired() };
}

describe('NodeHandoffStore keeps an undelivered handoff pending and prunes only a delivered claim (prd-14 FR-03, codereview_03 CR-01, codereview_04 CR-01)', () => {
  it.each([
    ['already expired', 0],
    ['expires during the move', 1],
  ])('keeps the handoff and a full archive when the deadline %s', async (_label, checksBeforeExpiry) => {
    await writeFile(join(archive, OLDEST), 'old');
    const before = await fillArchive();
    await expect(new NodeHandoffStore(root, clock).claim(expiresAfter(checksBeforeExpiry))).resolves.toBeNull();
    await expect(readFile(pending, 'utf8')).resolves.toBe('# goal\n');
    expect((await readdir(archive)).sort()).toEqual(before);
  });
  it('keeps a newer handoff and the archived one when both exist at restore time', async () => {
    const check = expiresAfter(1);
    function commitAfterNewer(): boolean {
      const committed = check.commit();
      if (!committed) writeFileSync(pending, '# newer\n');
      return committed;
    }
    await expect(new NodeHandoffStore(root, clock).claim({ isExpired: check.isExpired, commit: commitAfterNewer })).resolves.toBeNull();
    await expect(readFile(pending, 'utf8')).resolves.toBe('# newer\n');
    expect(await readdir(archive)).toEqual(['20261007T120000.000Z.md']);
  });
  it('rejects when the archive cannot be pruned, leaving the handoff pending, the archive unchanged, and no lock', async () => {
    await mkdir(join(archive, OLDEST));
    const before = await fillArchive();
    await expect(new NodeHandoffStore(root, clock).claim()).rejects.toThrow();
    await expect(readFile(pending, 'utf8')).resolves.toBe('# goal\n');
    expect((await readdir(archive)).sort()).toEqual(before);
  });
});
