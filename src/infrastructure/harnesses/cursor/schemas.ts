import { z } from 'zod/mini';

export const cursorHookCommandSchema = z.looseObject({
  command: z.optional(z.string()),
  failClosed: z.optional(z.boolean()),
});

export const cursorHooksFileSchema = z.looseObject({
  version: z.optional(z.number()),
  hooks: z.optional(z.record(z.string(), z.array(cursorHookCommandSchema))),
});

export const cursorPayloadSchema = z.looseObject({
  conversation_id: z.optional(z.string()),
  session_id: z.optional(z.string()),
  tool_name: z.optional(z.string()),
  tool_input: z.optional(z.unknown()),
  tool_output: z.optional(z.unknown()),
  tool_use_id: z.optional(z.string()),
  trigger: z.optional(z.string()),
  context_usage_percent: z.optional(z.number()),
  context_tokens: z.optional(z.number()),
  context_window_size: z.optional(z.number()),
  is_first_compaction: z.optional(z.boolean()),
});

export const cursorPreToolUsePayloadSchema = cursorPayloadSchema;
export const cursorPostToolUsePayloadSchema = cursorPayloadSchema;
export type CursorPayload = z.infer<typeof cursorPayloadSchema>;
