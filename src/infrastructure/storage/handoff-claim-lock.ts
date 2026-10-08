import { open, rm, stat } from 'node:fs/promises';
import type { Clock } from '../../core/contracts/session-ledger.js';
import { isMissingFileError } from '../runtime/runtime-paths.js';

const STALE_CLAIM_LOCK_MS = 30_000;

export async function createExclusive(path: string): Promise<boolean> {
  try {
    await (await open(path, 'wx')).close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
    throw error;
  }
}

export async function acquireClaimLock(lock: string, clock: Clock): Promise<boolean> {
  if (await createExclusive(lock)) return true;
  if (!(await isStale(lock, clock))) return false;
  await rm(lock, { force: true });
  return createExclusive(lock);
}

async function isStale(lock: string, clock: Clock): Promise<boolean> {
  try {
    return clock.now().getTime() - (await stat(lock)).mtimeMs > STALE_CLAIM_LOCK_MS;
  } catch (error) {
    if (isMissingFileError(error)) return true;
    throw error;
  }
}
