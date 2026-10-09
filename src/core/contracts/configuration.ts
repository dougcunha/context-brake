import { z } from 'zod/mini';
import { autoRestartSchema } from './auto-restart.js';
import { HARNESS_IDS } from './harness.js';
import { SNAPSHOT_TRIGGER_ZONES } from './zones.js';

export const INJECTION_MODES = ['threshold_only', 'always'] as const;
const DUPLICATE_ENTRIES_RULE = 'must not contain duplicates';
const TURN_PAIR_RULE = { green: 'must be set together with yellowMaxTurn', yellow: 'must be set together with greenMaxTurn' };
const percentage = z.int().check(z.minimum(0), z.maximum(100));
const positiveInt = z.int().check(z.positive());

type CustomIssue = { code: 'custom'; path: PropertyKey[]; input: unknown; message: string };

function isUnique<T>(values: T[]): boolean { return new Set(values).size === values.length; }
function addIssue(ctx: z.core.ParsePayload, issue: CustomIssue): void { ctx.issues.push(issue); }
function uniqueCheck<T>(message: string): (ctx: z.core.ParsePayload<T[]>) => void {
  return (ctx) => { if (!isUnique(ctx.value)) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message }); };
}

export const MAX_AGENT_COMMAND_LENGTH = 200;
const TRIMMED_RULE = 'must not have leading or trailing whitespace';
const RESUME_REQUIRES_COMMAND_RULE = 'requires snapshot.command';
const SINGLE_LINE_RULE = 'must be a single line';
const agentCommand = z.string().check(z.minLength(1), z.maxLength(MAX_AGENT_COMMAND_LENGTH), (ctx) => {
  if (ctx.value.trim() !== ctx.value) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: TRIMMED_RULE });
  if (/[\r\n]/.test(ctx.value)) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: SINGLE_LINE_RULE });
});
export const snapshotSchema = z.strictObject({ triggerZone: z._default(z.enum(SNAPSHOT_TRIGGER_ZONES), 'RED'), command: z.optional(agentCommand), resumeCommand: z.optional(agentCommand) }).check((ctx) => {
  if (ctx.value.resumeCommand !== undefined && ctx.value.command === undefined) addIssue(ctx, { code: 'custom', path: ['resumeCommand'], input: ctx.value.resumeCommand, message: RESUME_REQUIRES_COMMAND_RULE });
});
export type SnapshotConfig = z.infer<typeof snapshotSchema>;
export const DEFAULT_SNAPSHOT: SnapshotConfig = { triggerZone: 'RED' };
const optionalPositiveInt = z.optional(positiveInt);
export const zonesSchema = z.strictObject({ greenMaxPercentage: percentage, yellowMaxPercentage: percentage, criticalPercentage: z.int().check(z.minimum(1), z.maximum(100)), greenMaxTurn: optionalPositiveInt, yellowMaxTurn: optionalPositiveInt, criticalTurn: optionalPositiveInt }).check((ctx) => {
  const zones = ctx.value;
  if (zones.greenMaxPercentage >= zones.yellowMaxPercentage) addIssue(ctx, { code: 'custom', path: ['yellowMaxPercentage'], input: zones.yellowMaxPercentage, message: 'must be greater than greenMaxPercentage' });
  if (zones.yellowMaxPercentage >= zones.criticalPercentage) addIssue(ctx, { code: 'custom', path: ['yellowMaxPercentage'], input: zones.yellowMaxPercentage, message: 'must be less than criticalPercentage' });
  checkTurnPair(ctx, zones);
});
function checkTurnPair(ctx: z.core.ParsePayload, zones: { greenMaxTurn?: number | undefined; yellowMaxTurn?: number | undefined }): void {
  if (zones.greenMaxTurn !== undefined && zones.yellowMaxTurn === undefined) addIssue(ctx, { code: 'custom', path: ['yellowMaxTurn'], input: undefined, message: TURN_PAIR_RULE.yellow });
  if (zones.yellowMaxTurn !== undefined && zones.greenMaxTurn === undefined) addIssue(ctx, { code: 'custom', path: ['greenMaxTurn'], input: undefined, message: TURN_PAIR_RULE.green });
  if (zones.greenMaxTurn !== undefined && zones.yellowMaxTurn !== undefined && zones.greenMaxTurn >= zones.yellowMaxTurn) addIssue(ctx, { code: 'custom', path: ['greenMaxTurn'], input: zones.greenMaxTurn, message: 'must be less than yellowMaxTurn' });
}
const telemetrySchema = z.strictObject({ injectionMode: z.enum(INJECTION_MODES), activationThresholdPercentage: percentage, contextWindowCeiling: positiveInt, declaredContextWindow: optionalPositiveInt, turnCeiling: optionalPositiveInt, zones: zonesSchema });
export const configurationSchema = z.strictObject({ $schema: z.optional(z.url()), schemaVersion: z.literal(1), activeHarnesses: z.array(z.enum(HARNESS_IDS)).check(uniqueCheck(DUPLICATE_ENTRIES_RULE)), excludedHarnesses: z.optional(z.array(z.enum(HARNESS_IDS)).check(uniqueCheck(DUPLICATE_ENTRIES_RULE))), telemetry: telemetrySchema, snapshot: z._default(snapshotSchema, DEFAULT_SNAPSHOT), debug: z.optional(z.boolean()), gitIgnore: z.optional(z.boolean()), autoRestart: z.optional(autoRestartSchema) });
export type ContextBrakeConfig = z.infer<typeof configurationSchema>;
export { HARNESS_IDS } from './harness.js';
export { SNAPSHOT_TRIGGER_ZONES } from './zones.js';
export type { HarnessId } from './harness.js';
export const DEFAULT_CONFIG: ContextBrakeConfig = { $schema: 'https://unpkg.com/context-brake@1/schemas/context-brake.config.schema.json', schemaVersion: 1, activeHarnesses: [], telemetry: { injectionMode: 'threshold_only', activationThresholdPercentage: 50, contextWindowCeiling: 128000, zones: { greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75 } }, snapshot: { ...DEFAULT_SNAPSHOT } };
