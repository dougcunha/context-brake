import { z } from 'zod/mini';

export const codexHookItemSchema = z.looseObject({
  type: z.optional(z.string()),
  command: z.optional(z.string()),
  commandWindows: z.optional(z.string()),
});

export const codexHookGroupSchema = z.looseObject({
  matcher: z.optional(z.string()),
  hooks: z.optional(z.array(codexHookItemSchema)),
});

export const codexHooksFileSchema = z.looseObject({
  hooks: z.optional(z.record(z.string(), z.array(codexHookGroupSchema))),
});

export const codexPayloadSchema = z.looseObject({
  session_id: z.optional(z.string()),
  agent_id: z.optional(z.string()),
  source: z.optional(z.string()),
  tool_name: z.optional(z.string()),
  tool_input: z.optional(z.unknown()),
  tool_response: z.optional(z.unknown()),
  tool_use_id: z.optional(z.string()),
  last_assistant_message: z.optional(z.string()),
});

export const codexPreToolUsePayloadSchema = codexPayloadSchema;
export const codexPostToolUsePayloadSchema = codexPayloadSchema;
export type CodexPayload = z.infer<typeof codexPayloadSchema>;
