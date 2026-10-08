import { z } from 'zod/mini';
import { configurationSchema, type ContextBrakeConfig } from '../contracts/configuration.js';

export type ConfigurationIssue = { path: string; received: unknown; rule: string };
const UNRECOGNIZED_KEY_RULE = 'is not a recognized key';
export const UNRECOGNIZED_KEYS_REMEDIATION = 'Run context-brake init --yes to drop them, or remove them from context-brake.config.json.';
export class InvalidConfigurationError extends Error {
  readonly remediation: string | null;
  constructor(readonly issues: ConfigurationIssue[], readonly filePath?: string, options?: ErrorOptions) {
    super(validationMessage(issues), options);
    this.remediation = isUnrecognizedKeysOnly(issues) ? UNRECOGNIZED_KEYS_REMEDIATION : null;
  }
}
function isUnrecognizedKeysOnly(issues: readonly ConfigurationIssue[]): boolean {
  return issues.length > 0 && issues.every((issue) => issue.rule === UNRECOGNIZED_KEY_RULE);
}
function validationMessage(issues: readonly ConfigurationIssue[]): string {
  if (isUnrecognizedKeysOnly(issues)) return ['Configuration validation failed:', ...issues.map((issue) => `  ${issue.path} ${issue.rule}`)].join('\n');
  return `Configuration validation failed: ${issues.map((issue) => `${issue.path} ${issue.rule}`).join('; ')}.`;
}
export function configurationError(issues: readonly z.core.$ZodIssue[], source: unknown, filePath?: string): InvalidConfigurationError {
  return new InvalidConfigurationError(issues.flatMap((issue) => toIssues(issue, source)), filePath);
}
export function parseConfiguration(input: unknown, filePath?: string): ContextBrakeConfig {
  const result = configurationSchema.safeParse(input);
  if (result.success) return result.data;
  throw configurationError(result.error.issues, input, filePath);
}
function toIssues(issue: z.core.$ZodIssue, source: unknown): ConfigurationIssue[] {
  if (issue.code !== 'unrecognized_keys') return [toIssue(issue, source)];
  return issue.keys.map((key) => ({ path: [...issue.path, key].join('.'), received: valueAtPath(source, [...issue.path, key]), rule: UNRECOGNIZED_KEY_RULE }));
}
export function invalidSyntaxError(filePath: string, received: string, cause: unknown): InvalidConfigurationError { return new InvalidConfigurationError([{ path: '(syntax)', received, rule: 'must be valid JSON' }], filePath, { cause }); }
function toIssue(issue: z.core.$ZodIssue, source: unknown): ConfigurationIssue {
  const path = issue.path.join('.') || '(root)';
  return { path, received: 'input' in issue ? issue.input : valueAtPath(source, issue.path), rule: issue.message };
}
export function valueAtPath(source: unknown, path: PropertyKey[]): unknown {
  return path.reduce<unknown>((value, key) => value !== null && typeof value === 'object' ? (value as Record<PropertyKey, unknown>)[key] : undefined, source);
}
