import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function writeFileAtomically(targetPath: string, content: string): Promise<void> {
  const targetDir = dirname(targetPath);
  await mkdir(targetDir, { recursive: true });
  const tempPath = join(targetDir, `.cb-${randomUUID()}.tmp`);
  try {
    const handle = await open(tempPath, 'w');
    try {
      await handle.writeFile(content, 'utf8');
      await handle.sync().catch(() => {});
    } finally {
      await handle.close();
    }
    await rename(tempPath, targetPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

export async function deleteFileIfExists(targetPath: string): Promise<boolean> {
  try {
    await unlink(targetPath);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}
