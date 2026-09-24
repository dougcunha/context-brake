import { z } from 'zod/mini';
import type { SessionStreamEvent } from '../../../core/contracts/run-ports.js';
import { parseFields, parseTypedLine, type TypedStreamLine } from '../common/stream-line.js';

const threadStartedSchema = z.looseObject({ thread_id: z.string() });
const itemCompletedSchema = z.looseObject({ item: z.looseObject({ type: z.string(), text: z.optional(z.string()) }) });
const turnCompletedSchema = z.looseObject({ usage: z.looseObject({ input_tokens: z.number(), output_tokens: z.number() }) });
const errorSchema = z.looseObject({ message: z.string() });
const turnFailedSchema = z.looseObject({ error: errorSchema });

export function parseCodexStreamLine(line: string): readonly SessionStreamEvent[] {
  const typed = parseTypedLine(line);
  switch (typed.type) {
    case 'thread.started': return [{ kind: 'started', sessionId: parseFields(threadStartedSchema, typed).thread_id }];
    case 'item.completed': return agentMessage(typed);
    case 'turn.completed': return [{ kind: 'usage', tokens: turnTokens(typed) }];
    case 'turn.failed': return [{ kind: 'failed', detail: parseFields(turnFailedSchema, typed).error.message }];
    case 'error': return [{ kind: 'failed', detail: parseFields(errorSchema, typed).message }];
    default: return [];
  }
}

function agentMessage(line: TypedStreamLine): readonly SessionStreamEvent[] {
  const { item } = parseFields(itemCompletedSchema, line);
  if (item.type !== 'agent_message' || item.text === undefined) return [];
  return [{ kind: 'final_text', text: item.text }];
}

function turnTokens(line: TypedStreamLine): number {
  const { usage } = parseFields(turnCompletedSchema, line);
  return usage.input_tokens + usage.output_tokens;
}
