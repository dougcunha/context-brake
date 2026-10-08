import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { HANDOFF_ARCHIVE_LIMIT, HANDOFF_ARCHIVE_RELATIVE_DIR, HANDOFF_RELATIVE_PATH, type HandoffStore } from '../../core/contracts/handoff.js';
import type { ClaimDeadline } from '../../core/contracts/hook-phase.js';
import type { Clock } from '../../core/contracts/session-ledger.js';
import { isMissingFileError } from '../runtime/runtime-paths.js';
import { acquireClaimLock, createExclusive } from './handoff-claim-lock.js';

const ARCHIVE_EXTENSION = '.md';
const CLAIM_LOCK_NAME = '.claim.lock';

const OPEN_DEADLINE: ClaimDeadline = { isExpired: () => false, commit: () => true };

export class NodeHandoffStore implements HandoffStore {
  constructor(private readonly projectRoot: string, private readonly clock: Clock) {}

  async pendingSince(): Promise<number | null> {
    try {
      return (await stat(join(this.projectRoot, HANDOFF_RELATIVE_PATH))).mtimeMs;
    } catch (error) {
      if (isMissingFileError(error)) return null;
      throw error;
    }
  }

  async claim(deadline: ClaimDeadline = OPEN_DEADLINE): Promise<string | null> {
    if ((await this.pendingSince()) === null) return null;
    const archive = join(this.projectRoot, HANDOFF_ARCHIVE_RELATIVE_DIR);
    await mkdir(archive, { recursive: true });
    const lock = join(archive, CLAIM_LOCK_NAME);
    if (!(await acquireClaimLock(lock, this.clock))) return null;
    return this.claimLocked(archive, deadline).finally(() => rm(lock, { force: true }));
  }

  private async claimLocked(archive: string, deadline: ClaimDeadline): Promise<string | null> {
    if ((await this.pendingSince()) === null || deadline.isExpired()) return null;
    const name = await reserveName(archive, this.clock.now().toISOString().replace(/[-:]/g, ''));
    const pending = join(this.projectRoot, HANDOFF_RELATIVE_PATH);
    const archived = join(archive, name);
    if (!(await moveInto(pending, archived))) return null;
    if (!deadline.commit()) {
      await restoreHandoff(archived, pending);
      return null;
    }
    await pruneOrRestore(archive, archived, pending);
    return `${HANDOFF_ARCHIVE_RELATIVE_DIR}/${name}`;
  }
}

async function pruneOrRestore(archive: string, archived: string, pending: string): Promise<void> {
  try {
    await pruneArchive(archive, basename(archived));
  } catch (error: unknown) {
    await restoreHandoff(archived, pending);
    throw error;
  }
}

async function reserveName(archive: string, stamp: string): Promise<string> {
  for (let suffix = 0; ; suffix += 1) {
    const name = suffix === 0 ? `${stamp}${ARCHIVE_EXTENSION}` : `${stamp}-${suffix}${ARCHIVE_EXTENSION}`;
    if (await createExclusive(join(archive, name))) return name;
  }
}

async function moveInto(source: string, reserved: string): Promise<boolean> {
  try {
    await rename(source, reserved);
    return true;
  } catch (error) {
    await rm(reserved, { force: true });
    if (isMissingFileError(error)) return false;
    throw error;
  }
}

async function restoreHandoff(archived: string, pending: string): Promise<void> {
  try {
    await copyFile(archived, pending, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return;
    throw error;
  }
  await rm(archived, { force: true });
}

async function pruneArchive(archive: string, delivered: string): Promise<void> {
  const names = (await readdir(archive)).filter((name) => name.endsWith(ARCHIVE_EXTENSION) && name !== delivered).sort();
  const excess = names.slice(0, Math.max(0, names.length - (HANDOFF_ARCHIVE_LIMIT - 1)));
  await Promise.all(excess.map((name) => rm(join(archive, name), { force: true })));
}
