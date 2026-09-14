import { z } from 'zod';
import { HARNESS_IDS } from './harness.js';

export const INJECTION_MODES = ['threshold_only', 'always'] as const;
const relativePath = z.string().min(1).regex(/^(?!\/)(?!\\)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\/\/)(?!.*\/$).+$/, 'must be a canonical repository-relative POSIX file path').refine(isCanonicalRelativeFilePath, 'must be a canonical repository-relative POSIX file path');
function unique<T>(values: T[]): boolean { return new Set(values).size === values.length; }
function isCanonicalRelativeFilePath(value: string): boolean {
  if (value === '.' || value.endsWith('/')) return false;
  const segments = value.split('/');
  for (const segment of segments) if (segment === '' || segment === '.' || segment === '..') return false;
  return segments.length > 0;
}
function uniqueCanonicalPaths(values: string[]): boolean { return new Set(values.map((value) => value.split('/').join('/'))).size === values.length; }

export const zonesSchema = z.object({ greenMaxPercentage: z.number().int().min(0).max(100), yellowMaxPercentage: z.number().int().min(0).max(100), criticalPercentage: z.number().int().min(1).max(100), greenMaxTurn: z.number().int().positive(), yellowMaxTurn: z.number().int().positive(), criticalTurn: z.number().int().positive() }).strict().superRefine((value, context) => {
  if (value.greenMaxPercentage >= value.yellowMaxPercentage) context.addIssue({ code: 'custom', path: ['yellowMaxPercentage'], message: 'must be greater than greenMaxPercentage' });
  if (value.yellowMaxPercentage >= value.criticalPercentage) context.addIssue({ code: 'custom', path: ['yellowMaxPercentage'], message: 'must be less than criticalPercentage' });
  if (value.greenMaxTurn >= value.yellowMaxTurn) context.addIssue({ code: 'custom', path: ['greenMaxTurn'], message: 'must be less than yellowMaxTurn' });
  if (value.yellowMaxTurn >= value.criticalTurn) context.addIssue({ code: 'custom', path: ['yellowMaxTurn'], message: 'must be less than criticalTurn' });
});
export const configurationSchema = z.object({ $schema: z.string().url().optional(), schemaVersion: z.literal(1), activeHarnesses: z.array(z.enum(HARNESS_IDS)).refine(unique, 'must not contain duplicates'), telemetry: z.object({ injectionMode: z.enum(INJECTION_MODES), activationThresholdPercentage: z.number().int().min(0).max(100), contextWindowCeiling: z.number().int().positive(), turnCeiling: z.number().int().positive(), zones: zonesSchema }).strict(), stateStorage: z.object({ planFile: relativePath, checkpointFile: relativePath, instructCheckpointCommit: z.boolean(), bootMaxTokens: z.number().int().positive() }).strict(), instructionFiles: z.object({ targets: z.array(relativePath).min(1).refine(uniqueCanonicalPaths, 'must not contain duplicate canonical paths'), protocolFile: relativePath }).strict() }).strict();
export type ContextBrakeConfig = z.infer<typeof configurationSchema>;
export { HARNESS_IDS } from './harness.js';
export type { HarnessId } from './harness.js';
export const DEFAULT_CONFIG: ContextBrakeConfig = { $schema: 'https://unpkg.com/context-brake@1/schemas/context-brake.config.schema.json', schemaVersion: 1, activeHarnesses: [], telemetry: { injectionMode: 'threshold_only', activationThresholdPercentage: 50, contextWindowCeiling: 128000, turnCeiling: 12, zones: { greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 } }, stateStorage: { planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', instructCheckpointCommit: true, bootMaxTokens: 1000 }, instructionFiles: { targets: ['CLAUDE.md', 'AGENTS.md'], protocolFile: 'docs/context-brake-protocol.md' } };
