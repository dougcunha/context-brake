import { z } from 'zod';

export const piSettingsFileSchema = z.object({
  extensions: z.array(z.string()).optional(),
}).passthrough();

export const piToolCallPayloadSchema = z.object({
  toolName: z.string().optional(),
  toolCallId: z.string().optional(),
  input: z.unknown().optional(),
}).passthrough();

export const piToolResultPayloadSchema = z.object({
  toolName: z.string().optional(),
  toolCallId: z.string().optional(),
  content: z.unknown().optional(),
}).passthrough();
