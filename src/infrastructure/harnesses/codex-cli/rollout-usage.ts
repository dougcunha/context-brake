import { z } from 'zod/mini';
import { parseJsonLine, readLatestLine } from '../common/jsonl-tail-reader.js';

const TOKEN_COUNT_MARKER = '"token_count"';
const tokenCount = z.number().check(z.nonnegative());
const tokenCountLineSchema = z.looseObject({
  timestamp: z.string(),
  type: z.literal('event_msg'),
  payload: z.looseObject({
    type: z.literal('token_count'),
    info: z.looseObject({
      last_token_usage: z.looseObject({ total_tokens: tokenCount }),
      model_context_window: z.optional(z.nullable(z.number().check(z.positive()))),
    }),
  }),
});

export type RolloutUsage = { readonly tokens: number; readonly contextWindow: number | null; readonly at: string };

export function readRolloutUsage(path: string | undefined): Promise<RolloutUsage | null> {
  return readLatestLine(path, usageOf);
}

function usageOf(line: string): RolloutUsage | null {
  if (!line.includes(TOKEN_COUNT_MARKER)) return null;
  const result = tokenCountLineSchema.safeParse(parseJsonLine(line));
  if (!result.success) return null;
  const info = result.data.payload.info;
  return { tokens: info.last_token_usage.total_tokens, contextWindow: info.model_context_window ?? null, at: result.data.timestamp };
}
