import { z } from 'zod/mini';

export const opencodeConfigFileSchema = z.looseObject({
  plugin: z.optional(z.array(z.string())),
});

export const opencodeToolExecuteInputSchema = z.looseObject({
  tool: z.optional(z.string()),
  sessionID: z.optional(z.string()),
  sessionId: z.optional(z.string()),
  callID: z.optional(z.string()),
});

export const opencodeToolBeforeOutputSchema = z.looseObject({
  args: z.optional(z.unknown()),
});

export const opencodeToolAfterOutputSchema = z.looseObject({
  args: z.optional(z.unknown()),
  output: z.optional(z.unknown()),
  title: z.optional(z.string()),
  metadata: z.optional(z.unknown()),
});

export const opencodeSessionPropertiesSchema = z.looseObject({
  sessionID: z.optional(z.string()),
  sessionId: z.optional(z.string()),
  id: z.optional(z.string()),
  info: z.optional(z.looseObject({ id: z.optional(z.string()) })),
});

export const opencodeEventPayloadSchema = z.looseObject({
  event: z.optional(z.looseObject({
    type: z.optional(z.string()),
    properties: z.optional(opencodeSessionPropertiesSchema),
  })),
});

export const opencodeToolExecuteBeforePayloadSchema = z.looseObject({
  input: z.optional(opencodeToolExecuteInputSchema),
  output: z.optional(opencodeToolBeforeOutputSchema),
});

export const opencodeToolExecuteAfterPayloadSchema = z.looseObject({
  input: z.optional(opencodeToolExecuteInputSchema),
  output: z.optional(opencodeToolAfterOutputSchema),
});
