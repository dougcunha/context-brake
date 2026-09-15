import { z } from 'zod';

export const antigravityHookEntrySchema = z.object({
  type: z.string().optional(),
  command: z.string().optional(),
}).passthrough();

export const antigravityHooksFileSchema = z.record(
  z.string(),
  z.record(z.string(), z.unknown())
);

export const antigravityPreToolUsePayloadSchema = z.object({
  conversationId: z.string().optional(),
  toolName: z.string().optional(),
}).passthrough();

export const antigravityPreInvocationPayloadSchema = z.object({
  conversationId: z.string().optional(),
  invocationNum: z.number().optional(),
}).passthrough();
