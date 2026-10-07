import { z } from 'zod/mini';
import { configurationSchema, type ContextBrakeConfig } from '../contracts/configuration.js';

export type ConfigurationIssue = { path: string; received: unknown; rule: string };
export class InvalidConfigurationError extends Error {
  constructor(readonly issues: ConfigurationIssue[], readonly filePath?: string, options?: ErrorOptions) { super(validationMessage(issues), options); }
}
function validationMessage(issues: readonly ConfigurationIssue[]): string {
  return `Configuration validation failed: ${issues.map((issue) => `${issue.path} ${issue.rule}`).join('; ')}.`;
}
export function parseConfiguration(input: unknown, filePath?: string): ContextBrakeConfig {
  const result = configurationSchema.safeParse(input);
  if (result.success) return result.data;
  throw new InvalidConfigurationError(result.error.issues.flatMap((issue) => toIssues(issue, input)), filePath);
}
const UNRECOGNIZED_KEY_RULE = 'is not a recognized key';
function toIssues(issue: z.core.$ZodIssue, source: unknown): ConfigurationIssue[] {
  if (issue.code !== 'unrecognized_keys') return [toIssue(issue, source)];
  return issue.keys.map((key) => ({ path: [...issue.path, key].join('.'), received: valueAtPath(source, [...issue.path, key]), rule: UNRECOGNIZED_KEY_RULE }));
}
export function invalidSyntaxError(filePath: string, received: string, cause: unknown): InvalidConfigurationError { return new InvalidConfigurationError([{ path: '(syntax)', received, rule: 'must be valid JSON' }], filePath, { cause }); }
function toIssue(issue: z.core.$ZodIssue, source: unknown): ConfigurationIssue {
  const path = issue.path.join('.') || '(root)';
  return { path, received: 'input' in issue ? issue.input : valueAtPath(source, issue.path), rule: issue.message };
}
function valueAtPath(source: unknown, path: PropertyKey[]): unknown {
  return path.reduce<unknown>((value, key) => value !== null && typeof value === 'object' ? (value as Record<PropertyKey, unknown>)[key] : undefined, source);
}
