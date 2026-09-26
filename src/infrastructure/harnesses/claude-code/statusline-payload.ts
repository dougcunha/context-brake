import { z } from 'zod/mini';
import type { SessionKey } from '../../../core/contracts/runtime.js';
import { STATUSLINE_MODEL_MAX_LENGTH, type StatuslineLineInput } from '../../../core/contracts/statusline-line.js';

const MAXIMUM_PERCENTAGE = 100;

const statuslinePayloadSchema = z.object({
  session_id: z.optional(z.string()),
  model: z.optional(z.nullable(z.object({ id: z.optional(z.unknown()) }))),
  context_window: z.optional(z.nullable(z.object({
    context_window_size: z.optional(z.unknown()),
    total_input_tokens: z.optional(z.unknown()),
    used_percentage: z.optional(z.unknown()),
    current_usage: z.optional(z.unknown()),
  }))),
});

type StatuslinePayload = z.infer<typeof statuslinePayloadSchema>;
type ContextWindow = NonNullable<StatuslinePayload['context_window']>;
export type StatuslineRecord = { readonly session: SessionKey; readonly line: StatuslineLineInput };

export function mapStatuslinePayload(payload: unknown): StatuslineRecord | null {
  const result = statuslinePayloadSchema.safeParse(payload);
  if (!result.success) return null;
  const sessionId = result.data.session_id;
  if (sessionId === undefined || sessionId === '') return null;
  const window = result.data.context_window ?? {};
  const line = { windowTokens: positiveInteger(window.context_window_size), inputTokens: inputTokens(window), usedPercentage: percentage(window.used_percentage), model: modelId(result.data.model?.id) };
  return { session: { harness: 'claude-code', sessionId, agentId: null }, line };
}

function inputTokens(window: ContextWindow): number | null {
  return window.current_usage === null ? null : positiveInteger(window.total_input_tokens);
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function percentage(value: unknown): number | null {
  return typeof value === 'number' && value >= 0 && value <= MAXIMUM_PERCENTAGE ? value : null;
}

function modelId(value: unknown): string | null {
  return typeof value === 'string' && value !== '' && value.length <= STATUSLINE_MODEL_MAX_LENGTH ? value : null;
}
