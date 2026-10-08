import { z } from 'zod/mini';
import { parseJsonLine, readLatestLine } from '../common/jsonl-tail-reader.js';

export { TranscriptUnreadableError } from '../common/jsonl-tail-reader.js';

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

export function readTranscriptUsage(path: string | undefined): Promise<TranscriptUsage | null> {
  return readLatestLine(path, usageOf);
}

function usageOf(line: string): TranscriptUsage | null {
  if (!line.includes('"usage"')) return null;
  const result = assistantLineSchema.safeParse(parseJsonLine(line));
  if (!result.success || result.data.isSidechain === true) return null;
  const usage = result.data.message.usage;
  return { tokens: usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens, at: result.data.timestamp };
}
