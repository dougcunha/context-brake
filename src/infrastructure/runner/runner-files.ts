import { readFile } from 'node:fs/promises';
import { isMissingFileError } from '../runtime/runtime-paths.js';

export async function readOptionalFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

export function parseJsonOrNull(source: string): unknown {
  try {
    return JSON.parse(source) as unknown;
  } catch {
    return null;
  }
}
