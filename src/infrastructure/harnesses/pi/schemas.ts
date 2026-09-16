import { z } from 'zod/mini';

export const piSettingsFileSchema = z.looseObject({
  extensions: z.optional(z.array(z.string())),
});

export const piPayloadSchema = z.looseObject({
  toolName: z.optional(z.string()),
  toolCallId: z.optional(z.string()),
  input: z.optional(z.unknown()),
  content: z.optional(z.unknown()),
  reason: z.optional(z.string()),
  message: z.optional(z.unknown()),
  last_assistant_message: z.optional(z.string()),
});

export const piToolCallPayloadSchema = piPayloadSchema;
export const piToolResultPayloadSchema = piPayloadSchema;
export const piSessionStartPayloadSchema = piPayloadSchema;
export const piSessionCompactPayloadSchema = piPayloadSchema;
export const piMessageEndPayloadSchema = piPayloadSchema;
export type PiPayload = z.infer<typeof piPayloadSchema>;
