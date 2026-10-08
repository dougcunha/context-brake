import { mkdir, utimes, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { HANDOFF_RELATIVE_PATH } from '../../src/core/contracts/handoff.js';

export const HANDOFF_OFFSET_MS = 60_000;

export async function writeHandoffAt(root: string, offsetMs: number): Promise<void> {
  const path = join(root, HANDOFF_RELATIVE_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, '# Goal\n', 'utf8');
  const at = new Date(Date.now() + offsetMs);
  await utimes(path, at, at);
}
