import { z } from 'zod';

export const opencodeConfigFileSchema = z.object({
  plugin: z.array(z.string()).optional(),
}).passthrough();

export const opencodeToolExecuteBeforePayloadSchema = z.object({
  tool: z.string().optional(),
  input: z.unknown().optional(),
}).passthrough();

export const opencodeToolExecuteAfterPayloadSchema = z.object({
  tool: z.string().optional(),
  output: z.object({
    output: z.unknown().optional(),
    title: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();
