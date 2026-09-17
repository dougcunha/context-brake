import { z } from 'zod/mini';

export type ValidationIssue = { path: string; received: unknown; rule: string };

export const SYNTAX_RULE = 'must be valid JSON';

export function valueAtPath(source: unknown, path: PropertyKey[]): unknown {
  return path.reduce<unknown>((value, key) => (value !== null && typeof value === 'object' ? (value as Record<PropertyKey, unknown>)[key] : undefined), source);
}

export function toIssue(issue: z.core.$ZodIssue, source: unknown): ValidationIssue {
  const path = issue.path.join('.') || '(root)';
  return { path, received: 'input' in issue ? issue.input : valueAtPath(source, issue.path), rule: issue.message };
}

export function toIssues(issues: readonly z.core.$ZodIssue[], source: unknown): ValidationIssue[] {
  return issues.map((issue) => toIssue(issue, source));
}

export function syntaxIssue(received: string): ValidationIssue {
  return { path: '(syntax)', received, rule: SYNTAX_RULE };
}

export function versionMismatchIssue(input: unknown, expected: number): ValidationIssue | null {
  if (input === null || typeof input !== 'object') return null;
  const received = (input as Record<string, unknown>)['schemaVersion'];
  if (received === undefined || received === expected) return null;
  return { path: 'schemaVersion', received, rule: `must be ${expected}; migrate the file to schema version ${expected}` };
}
