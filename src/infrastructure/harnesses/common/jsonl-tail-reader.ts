import { open, type FileHandle } from 'node:fs/promises';
import { isMissingFileError } from '../../runtime/runtime-paths.js';

const CHUNK_BYTES = 64 * 1024;
const MAXIMUM_BYTES = 4 * 1024 * 1024;
const NEWLINE = 0x0a;

export type LineReader<T> = (line: string) => T | null;

export class TranscriptUnreadableError extends Error {
  constructor(options?: ErrorOptions) { super('The session transcript could not be read.', options); this.name = 'TranscriptUnreadableError'; }
}

export async function readLatestLine<T>(path: string | undefined, readLine: LineReader<T>): Promise<T | null> {
  if (path === undefined || path === '') return null;
  let handle: FileHandle;
  try {
    handle = await open(path, 'r');
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw new TranscriptUnreadableError({ cause: error });
  }
  try {
    return await scanBackwards(handle, readLine);
  } catch (error) {
    throw new TranscriptUnreadableError({ cause: error });
  } finally {
    await handle.close().catch(() => undefined);
  }
}

export function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line) as unknown;
  } catch {
    return null;
  }
}

async function scanBackwards<T>(handle: FileHandle, readLine: LineReader<T>): Promise<T | null> {
  const stats = await handle.stat();
  if (!stats.isFile()) throw new Error('The transcript path is not a regular file.');
  const size = stats.size;
  const floor = Math.max(0, size - MAXIMUM_BYTES);
  let end = size;
  let pending: Buffer[] = [];
  while (end > floor) {
    const start = Math.max(floor, end - CHUNK_BYTES);
    const chunk = await readRange(handle, start, end);
    end = start;
    const cut = start === 0 ? 0 : chunk.indexOf(NEWLINE);
    if (cut === -1) {
      pending = [chunk, ...pending];
      continue;
    }
    const value = latestValue(Buffer.concat([chunk.subarray(cut), ...pending]), readLine);
    if (value !== null) return value;
    pending = [chunk.subarray(0, cut)];
  }
  return null;
}

async function readRange(handle: FileHandle, start: number, end: number): Promise<Buffer> {
  const buffer = Buffer.alloc(end - start);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
  return buffer.subarray(0, bytesRead);
}

function latestValue<T>(block: Buffer, readLine: LineReader<T>): T | null {
  const lines = block.toString('utf8').split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const value = readLine(lines[index] ?? '');
    if (value !== null) return value;
  }
  return null;
}
