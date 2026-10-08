import { z } from 'zod/mini';
import { configurationSchema, type ContextBrakeConfig } from '../contracts/configuration.js';
import { configurationError, valueAtPath } from './configuration-validator.js';

export type DroppedKey = { path: string; received: unknown };
export type SanitizedConfiguration = { config: ContextBrakeConfig; dropped: DroppedKey[] };

function isUnrecognizedKeys(issue: z.core.$ZodIssue): issue is z.core.$ZodIssueUnrecognizedKeys {
  return issue.code === 'unrecognized_keys';
}

function removeKeys(root: unknown, issue: z.core.$ZodIssueUnrecognizedKeys): DroppedKey[] {
  const target = valueAtPath(root, issue.path);
  if (target === null || typeof target !== 'object') return [];
  const record = target as Record<string, unknown>;
  return issue.keys.filter((key) => key in record).map((key) => {
    const received = record[key];
    delete record[key];
    return { path: [...issue.path, key].join('.'), received };
  });
}

export function sanitizeConfiguration(input: unknown, filePath?: string): SanitizedConfiguration {
  const current = structuredClone(input);
  const dropped: DroppedKey[] = [];
  while (true) {
    const result = configurationSchema.safeParse(current);
    if (result.success) return { config: result.data, dropped };
    const keyIssues = result.error.issues.filter(isUnrecognizedKeys);
    const removed = keyIssues.length === result.error.issues.length ? keyIssues.flatMap((issue) => removeKeys(current, issue)) : [];
    if (removed.length === 0) throw configurationError(result.error.issues, current, filePath);
    dropped.push(...removed);
  }
}
