import { z } from 'zod';

export const piSettingsFileSchema = z.object({
  extensions: z.array(z.string()).optional(),
}).passthrough();

export const piToolCallPayloadSchema = z.object({
  name: z.string().optional(),
  input: z.unknown().optional(),
}).passthrough();

export const piToolResultPayloadSchema = z.object({
  name: z.string().optional(),
  content: z.unknown().optional(),
}).passthrough();
