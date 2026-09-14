import { z } from 'zod';

export const cursorHookCommandSchema = z.object({
  command: z.string().optional(),
  failClosed: z.boolean().optional(),
}).passthrough();

export const cursorHooksFileSchema = z.object({
  version: z.number().optional(),
  hooks: z.record(z.string(), z.array(cursorHookCommandSchema)).optional(),
}).passthrough();

export const cursorPreToolUsePayloadSchema = z.object({
  conversation_id: z.string().optional(),
  hook_event_name: z.string().optional(),
  tool_name: z.string().optional(),
}).passthrough();

export const cursorPostToolUsePayloadSchema = z.object({
  conversation_id: z.string().optional(),
  hook_event_name: z.string().optional(),
  tool_output: z.unknown().optional(),
}).passthrough();
