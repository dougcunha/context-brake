import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function loadHarnessPayload(harness: string, file: string): Promise<unknown> {
  return JSON.parse(await readFile(join(__dirname, '../fixtures/harnesses', harness, file), 'utf8')) as unknown;
}
