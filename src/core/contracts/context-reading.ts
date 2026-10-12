import { z } from 'zod/mini';
import type { HarnessId } from './harness.js';

export const CONTEXT_READINGS_RELATIVE_DIR = '.context-brake/runtime/context-readings';
export const CONTEXT_READING_MAXIMUM_CHARACTERS = 1024;
export const RUNTIME_IGNORE_RELATIVE_PATH = '.context-brake/runtime/.gitignore';
export const RUNTIME_IGNORE_CONTENT = '*\n';
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PERCENTAGE_MAXIMUM = 100;

export const contextReadingSchema = z.strictObject({
  v: z.literal(1),
  at: z.string().check(z.minLength(1)),
  windowTokens: z.nullable(z.int().check(z.positive())),
  inputTokens: z.nullable(z.int().check(z.nonnegative())),
  usedPercentage: z.nullable(z.number().check(z.gte(0), z.lte(PERCENTAGE_MAXIMUM))),
});

export type ContextReading = z.infer<typeof contextReadingSchema>;

export function isReadingSessionId(value: string | undefined): value is string {
  return value !== undefined && SESSION_ID_PATTERN.test(value);
}

export function contextReadingRelativePath(harness: HarnessId, sessionId: string): string {
  return `${CONTEXT_READINGS_RELATIVE_DIR}/${harness}/${sessionId}.json`;
}
