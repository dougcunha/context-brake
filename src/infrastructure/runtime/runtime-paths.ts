import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { SessionKey } from '../../core/contracts/runtime.js';
import { RUNTIME_STATE_RELATIVE_DIR } from '../storage/runtime-state-files.js';

export const RUNTIME_GITIGNORE_CONTENT = '*\n';
export const SESSIONS_DIR_NAME = 'sessions';
export const LEDGER_FILE_EXTENSION = '.jsonl';
export const SESSIONS_RELATIVE_PREFIX = `${RUNTIME_STATE_RELATIVE_DIR}/${SESSIONS_DIR_NAME}/`;

const HASH_LENGTH = 32;

export function runtimeDirectory(projectRoot: string): string {
  return resolve(projectRoot, RUNTIME_STATE_RELATIVE_DIR);
}
export function sessionsDirectory(projectRoot: string, harness: SessionKey['harness']): string {
  return join(runtimeDirectory(projectRoot), SESSIONS_DIR_NAME, harness);
}
export function sessionLedgerHash(key: SessionKey): string {
  return createHash('sha256').update(`${key.sessionId}\0${key.agentId ?? ''}`).digest('hex').slice(0, HASH_LENGTH);
}
export function sessionLedgerPath(projectRoot: string, key: SessionKey): string {
  return join(sessionsDirectory(projectRoot, key.harness), `${sessionLedgerHash(key)}${LEDGER_FILE_EXTENSION}`);
}
export async function ensureRuntimeDirectory(projectRoot: string): Promise<void> {
  const directory = runtimeDirectory(projectRoot);
  await mkdir(join(directory, SESSIONS_DIR_NAME), { recursive: true });
  await writeGitignoreIfMissing(join(directory, '.gitignore'));
}
export async function ensureSessionDirectory(projectRoot: string, key: SessionKey): Promise<void> {
  await ensureRuntimeDirectory(projectRoot);
  await mkdir(sessionsDirectory(projectRoot, key.harness), { recursive: true });
}
export function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}
async function writeGitignoreIfMissing(filePath: string): Promise<void> {
  try {
    await writeFile(filePath, RUNTIME_GITIGNORE_CONTENT, { flag: 'wx' });
  } catch (error) {
    if (!isAlreadyCreated(error)) throw error;
  }
}
function isAlreadyCreated(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'EEXIST';
}
