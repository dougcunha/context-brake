import { z } from 'zod';

export const ompSettingsFileSchema = z.object({
  extensions: z.array(z.string()).optional(),
}).passthrough();

export const ompToolCallPayloadSchema = z.object({
  toolName: z.string().optional(),
  toolCallId: z.string().optional(),
  input: z.unknown().optional(),
}).passthrough();

export const ompToolResultPayloadSchema = z.object({
  toolName: z.string().optional(),
  toolCallId: z.string().optional(),
  content: z.unknown().optional(),
}).passthrough();
