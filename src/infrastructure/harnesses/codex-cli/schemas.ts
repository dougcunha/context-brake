import { z } from 'zod';

export const codexHookItemSchema = z.object({
  type: z.string().optional(),
  command: z.string().optional(),
}).passthrough();

export const codexHookGroupSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(codexHookItemSchema).optional(),
}).passthrough();

export const codexHooksFileSchema = z.object({
  hooks: z.record(z.string(), z.array(codexHookGroupSchema)).optional(),
}).passthrough();

export const codexPreToolUsePayloadSchema = z.object({
  session_id: z.string().optional(),
  hook_event_name: z.string().optional(),
  tool_name: z.string().optional(),
}).passthrough();

export const codexPostToolUsePayloadSchema = z.object({
  session_id: z.string().optional(),
  hook_event_name: z.string().optional(),
  tool_response: z.unknown().optional(),
}).passthrough();
