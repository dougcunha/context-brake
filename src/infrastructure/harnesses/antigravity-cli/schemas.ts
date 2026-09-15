import { z } from 'zod';

export const antigravityHookEntrySchema = z.object({
  type: z.string().optional(),
  command: z.string().optional(),
}).passthrough();

export const antigravityHooksFileSchema = z.record(
  z.string(),
  z.record(z.string(), z.unknown())
);

export const antigravityToolCallSchema = z.object({
  name: z.string().optional(),
  args: z.unknown().optional(),
}).passthrough();

export const antigravityPreToolUsePayloadSchema = z.object({
  conversationId: z.string().optional(),
  toolCall: antigravityToolCallSchema.optional(),
}).passthrough();

export const antigravityPreInvocationPayloadSchema = z.object({
  conversationId: z.string().optional(),
  invocationNum: z.number().optional(),
}).passthrough();
