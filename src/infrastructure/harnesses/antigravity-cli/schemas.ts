import { z } from 'zod/mini';

export const antigravityHookEntrySchema = z.looseObject({
  type: z.optional(z.string()),
  command: z.optional(z.string()),
});

export const antigravityHooksFileSchema = z.record(
  z.string(),
  z.record(z.string(), z.unknown())
);

export const antigravityPayloadSchema = z.looseObject({
  conversationId: z.optional(z.string()),
  toolCall: z.optional(z.looseObject({
    name: z.optional(z.string()),
    args: z.optional(z.unknown()),
  })),
  stepIdx: z.optional(z.number()),
  error: z.optional(z.string()),
  invocationNum: z.optional(z.number()),
  initialNumSteps: z.optional(z.number()),
  terminationReason: z.optional(z.string()),
});

export const antigravityPreToolUsePayloadSchema = antigravityPayloadSchema;
export const antigravityPreInvocationPayloadSchema = antigravityPayloadSchema;
export type AntigravityPayload = z.infer<typeof antigravityPayloadSchema>;
