import { z } from 'zod/mini';

export const claudeHookItemSchema = z.looseObject({
  type: z.optional(z.string()),
  command: z.optional(z.string()),
  args: z.optional(z.array(z.string())),
});

export const claudeHookGroupSchema = z.looseObject({
  matcher: z.optional(z.string()),
  hooks: z.optional(z.array(claudeHookItemSchema)),
});

export const claudeSettingsSchema = z.looseObject({
  hooks: z.optional(z.record(z.string(), z.array(claudeHookGroupSchema))),
});

export const claudePayloadSchema = z.looseObject({
  session_id: z.optional(z.string()),
  agent_id: z.optional(z.string()),
  source: z.optional(z.string()),
  tool_name: z.optional(z.string()),
  tool_input: z.optional(z.unknown()),
  tool_response: z.optional(z.unknown()),
  tool_use_id: z.optional(z.string()),
  last_assistant_message: z.optional(z.string()),
});

export const claudePreToolUsePayloadSchema = claudePayloadSchema;
export type ClaudePayload = z.infer<typeof claudePayloadSchema>;

export const claudePreToolUseResponseSchema = z.looseObject({
  hookSpecificOutput: z.optional(z.looseObject({
    hookEventName: z.literal('PreToolUse'),
    permissionDecision: z.optional(z.enum(['allow', 'deny', 'ask', 'defer'])),
    permissionDecisionReason: z.optional(z.string()),
  })),
});

export const claudePostToolUseResponseSchema = z.looseObject({
  hookSpecificOutput: z.optional(z.looseObject({
    hookEventName: z.literal('PostToolUse'),
    additionalContext: z.optional(z.string()),
  })),
});
