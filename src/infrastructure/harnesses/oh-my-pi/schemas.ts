import { z } from 'zod/mini';

export const ompSettingsFileSchema = z.looseObject({
  extensions: z.optional(z.array(z.string())),
});

export const ompPayloadSchema = z.looseObject({
  toolName: z.optional(z.string()),
  toolCallId: z.optional(z.string()),
  input: z.optional(z.unknown()),
  content: z.optional(z.unknown()),
  reason: z.optional(z.string()),
  message: z.optional(z.unknown()),
  last_assistant_message: z.optional(z.string()),
});

export const ompToolCallPayloadSchema = ompPayloadSchema;
export const ompToolResultPayloadSchema = ompPayloadSchema;
export const ompSessionStartPayloadSchema = ompPayloadSchema;
export const ompSessionCompactPayloadSchema = ompPayloadSchema;
export const ompSessionStopPayloadSchema = ompPayloadSchema;
export type OmpPayload = z.infer<typeof ompPayloadSchema>;
