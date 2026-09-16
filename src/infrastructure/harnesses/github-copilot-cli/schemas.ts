import { z } from 'zod/mini';

export const copilotHookItemSchema = z.looseObject({
  type: z.optional(z.string()),
  exec: z.optional(z.string()),
  args: z.optional(z.array(z.string())),
  command: z.optional(z.string()),
  cwd: z.optional(z.string()),
});

export const copilotHooksFileSchema = z.looseObject({
  version: z.optional(z.number()),
  hooks: z.optional(z.record(z.string(), z.array(copilotHookItemSchema))),
});

export const copilotPayloadSchema = z.looseObject({
  sessionId: z.optional(z.string()),
  source: z.optional(z.string()),
  toolName: z.optional(z.string()),
  toolArgs: z.optional(z.unknown()),
  toolResult: z.optional(z.unknown()),
  hookName: z.optional(z.string()),
});

export const copilotPreToolUsePayloadSchema = copilotPayloadSchema;
export const copilotPostToolUsePayloadSchema = copilotPayloadSchema;
export type CopilotPayload = z.infer<typeof copilotPayloadSchema>;
