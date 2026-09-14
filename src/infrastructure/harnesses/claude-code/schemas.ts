import { z } from 'zod';

export const claudeHookItemSchema = z.object({
  type: z.string().optional(),
  command: z.string().optional(),
}).passthrough();

export const claudeHookGroupSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(claudeHookItemSchema).optional(),
}).passthrough();

export const claudeSettingsSchema = z.object({
  hooks: z.record(z.string(), z.array(claudeHookGroupSchema)).optional(),
}).passthrough();

export const claudePreToolUsePayloadSchema = z.object({
  session_id: z.string().optional(),
  hook_event_name: z.string().optional(),
  tool_name: z.string().optional(),
  tool_input: z.unknown().optional(),
}).passthrough();

export const claudePostToolUsePayloadSchema = z.object({
  session_id: z.string().optional(),
  hook_event_name: z.string().optional(),
  tool_name: z.string().optional(),
  tool_output: z.unknown().optional(),
}).passthrough();

export const claudePreToolUseResponseSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('PreToolUse'),
    permissionDecision: z.enum(['allow', 'deny', 'ask', 'defer']).optional(),
    permissionDecisionReason: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

export const claudePostToolUseResponseSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('PostToolUse'),
    additionalContext: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();
