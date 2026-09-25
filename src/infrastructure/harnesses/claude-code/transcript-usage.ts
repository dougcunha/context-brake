import { open, type FileHandle } from 'node:fs/promises';
import { z } from 'zod/mini';
import { isMissingFileError } from '../../runtime/runtime-paths.js';

const CHUNK_BYTES = 64 * 1024;
const MAXIMUM_BYTES = 4 * 1024 * 1024;
const NEWLINE = 0x0a;
const tokenCount = z.number().check(z.nonnegative());
const assistantLineSchema = z.looseObject({
  type: z.literal('assistant'),
  isSidechain: z.optional(z.unknown()),
  timestamp: z.string(),
  message: z.looseObject({
    usage: z.looseObject({ input_tokens: tokenCount, cache_creation_input_tokens: tokenCount, cache_read_input_tokens: tokenCount }),
  }),
});

export type TranscriptUsage = { readonly tokens: number; readonly at: string };

export class TranscriptUnreadableError extends Error {
  constructor(options?: ErrorOptions) { super('The session transcript could not be read.', options); this.name = 'TranscriptUnreadableError'; }
}

export async function readTranscriptUsage(path: string | undefined): Promise<TranscriptUsage | null> {
  if (path === undefined || path === '') return null;
  let handle: FileHandle;
  try {
    handle = await open(path, 'r');
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw new TranscriptUnreadableError({ cause: error });
  }
  try {
    return await scanBackwards(handle);
  } catch (error) {
    throw new TranscriptUnreadableError({ cause: error });
  } finally {
    await handle.close().catch(() => undefined);
  }
}

async function scanBackwards(handle: FileHandle): Promise<TranscriptUsage | null> {
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
    const usage = latestUsage(Buffer.concat([chunk.subarray(cut), ...pending]));
    if (usage !== null) return usage;
    pending = [chunk.subarray(0, cut)];
  }
  return null;
}

async function readRange(handle: FileHandle, start: number, end: number): Promise<Buffer> {
  const buffer = Buffer.alloc(end - start);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
  return buffer.subarray(0, bytesRead);
}

function latestUsage(block: Buffer): TranscriptUsage | null {
  const lines = block.toString('utf8').split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const usage = usageOf(lines[index] ?? '');
    if (usage !== null) return usage;
  }
  return null;
}

function usageOf(line: string): TranscriptUsage | null {
  if (!line.includes('"usage"')) return null;
  const result = assistantLineSchema.safeParse(parseLine(line));
  if (!result.success || result.data.isSidechain === true) return null;
  const usage = result.data.message.usage;
  return { tokens: usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens, at: result.data.timestamp };
}

function parseLine(line: string): unknown {
  try {
    return JSON.parse(line) as unknown;
  } catch {
    return null;
  }
}
