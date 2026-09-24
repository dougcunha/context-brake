import { z } from 'zod/mini';
import type { SessionStreamEvent } from '../../../core/contracts/run-ports.js';
import { parseFields, parseTypedLine } from '../common/stream-line.js';

const optionalCount = z.optional(z.nullable(z.number()));

const systemSchema = z.looseObject({ subtype: z.string() });
const initSchema = z.looseObject({ session_id: z.string() });
const usageSchema = z.looseObject({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: optionalCount,
  cache_read_input_tokens: optionalCount,
});
const resultSchema = z.looseObject({
  subtype: z.string(),
  is_error: z.optional(z.boolean()),
  result: z.optional(z.string()),
  errors: z.optional(z.array(z.string())),
  usage: z.optional(usageSchema),
});

type ClaudeUsage = z.infer<typeof usageSchema>;
type ClaudeResult = z.infer<typeof resultSchema>;

export function parseClaudeStreamLine(line: string): readonly SessionStreamEvent[] {
  const typed = parseTypedLine(line);
  if (typed.type === 'result') return resultEvents(parseFields(resultSchema, typed));
  if (typed.type !== 'system' || parseFields(systemSchema, typed).subtype !== 'init') return [];
  return [{ kind: 'started', sessionId: parseFields(initSchema, typed).session_id }];
}

function resultEvents(result: ClaudeResult): readonly SessionStreamEvent[] {
  const usage: SessionStreamEvent[] = result.usage === undefined ? [] : [{ kind: 'usage', tokens: totalTokens(result.usage) }];
  if (result.subtype === 'success' && result.is_error !== true && result.result !== undefined) {
    return [...usage, { kind: 'final_text', text: result.result }];
  }
  return [...usage, { kind: 'failed', detail: failureDetail(result) }];
}

function totalTokens(usage: ClaudeUsage): number {
  return usage.input_tokens + usage.output_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
}

function failureDetail(result: ClaudeResult): string {
  if (result.result !== undefined && result.result !== '') return result.result;
  if (result.errors !== undefined && result.errors.length > 0) return result.errors.join('; ');
  return result.subtype;
}
