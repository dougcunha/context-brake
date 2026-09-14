import { z } from 'zod';

export const ompSettingsFileSchema = z.object({
  extensions: z.array(z.string()).optional(),
}).passthrough();

export const ompToolCallPayloadSchema = z.object({
  name: z.string().optional(),
  input: z.unknown().optional(),
}).passthrough();

export const ompToolResultPayloadSchema = z.object({
  name: z.string().optional(),
  content: z.unknown().optional(),
}).passthrough();
