import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CONTEXT_READINGS_RELATIVE_DIR, type ContextReading } from '../../../core/contracts/context-reading.js';
import { parseContextReading } from './mod-reading.js';

const READING_EXTENSION = '.json';

async function modifiedMilliseconds(path: string): Promise<number> {
  return (await stat(path).catch(() => null))?.mtimeMs ?? 0;
}

async function newestFirst(directory: string): Promise<string[]> {
  const names = (await readdir(directory).catch((): string[] => [])).filter((name) => name.endsWith(READING_EXTENSION));
  const dated = await Promise.all(names.map(async (name) => ({ path: join(directory, name), time: await modifiedMilliseconds(join(directory, name)) })));
  return dated.sort((left, right) => right.time - left.time).map((entry) => entry.path);
}

export async function latestContextReading(projectRoot: string): Promise<ContextReading | null> {
  for (const path of await newestFirst(resolve(projectRoot, CONTEXT_READINGS_RELATIVE_DIR, 'claude-code'))) {
    const reading = parseContextReading(await readFile(path, 'utf8').catch(() => ''));
    if (reading !== null) return reading;
  }
  return null;
}
