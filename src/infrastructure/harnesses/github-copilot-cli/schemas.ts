import { z } from 'zod';

export const copilotHookItemSchema = z.object({
  type: z.string().optional(),
  exec: z.string().optional(),
  args: z.array(z.string()).optional(),
  command: z.string().optional(),
}).passthrough();

export const copilotHooksFileSchema = z.object({
  version: z.number().optional(),
  hooks: z.record(z.string(), z.array(copilotHookItemSchema)).optional(),
}).passthrough();

export const copilotPreToolUsePayloadSchema = z.object({
  sessionId: z.string().optional(),
  toolName: z.string().optional(),
  toolArgs: z.unknown().optional(),
}).passthrough();

export const copilotPostToolUsePayloadSchema = z.object({
  sessionId: z.string().optional(),
  toolName: z.string().optional(),
  toolResult: z.unknown().optional(),
}).passthrough();
