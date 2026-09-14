import { z } from 'zod';
import { configurationSchema, type ContextBrakeConfig } from '../contracts/configuration.js';

export type ConfigurationIssue = { path: string; received: unknown; rule: string };
export class InvalidConfigurationError extends Error {
  constructor(readonly issues: ConfigurationIssue[], readonly filePath?: string, options?: ErrorOptions) { super('Configuration validation failed.', options); }
}
export function parseConfiguration(input: unknown, filePath?: string): ContextBrakeConfig {
  const result = configurationSchema.safeParse(input);
  if (result.success) return result.data;
  throw new InvalidConfigurationError(result.error.issues.map((issue) => toIssue(issue, input)), filePath);
}
export function invalidSyntaxError(filePath: string, received: string, cause: unknown): InvalidConfigurationError { return new InvalidConfigurationError([{ path: '(syntax)', received, rule: 'must be valid JSON' }], filePath, { cause }); }
function toIssue(issue: z.core.$ZodIssue, source: unknown): ConfigurationIssue {
  const path = issue.path.join('.') || '(root)';
  return { path, received: 'input' in issue ? issue.input : valueAtPath(source, issue.path), rule: issue.message };
}
function valueAtPath(source: unknown, path: PropertyKey[]): unknown {
  return path.reduce<unknown>((value, key) => value !== null && typeof value === 'object' ? (value as Record<PropertyKey, unknown>)[key] : undefined, source);
}
