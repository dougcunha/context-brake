import { z } from 'zod/mini';
import { HARNESS_IDS } from './harness.js';
import { RUNNER_DEFAULTS, runnerConfigurationSchema } from './runner-configuration.js';

export const INJECTION_MODES = ['threshold_only', 'always'] as const;
const CANONICAL_PATH_RULE = 'must be a canonical repository-relative POSIX file path';
const DUPLICATE_ENTRIES_RULE = 'must not contain duplicates';
const DUPLICATE_PATHS_RULE = 'must not contain duplicate canonical paths';
const TURN_CEILING_RULE = 'must equal telemetry.zones.criticalTurn';
const TRIMMED_RULE = 'must not have leading or trailing whitespace';
const SHELL_OPERATOR_RULE = 'must not contain shell operators or line breaks';
const ADDITIONAL_ALLOWED_COMMANDS_RULE = 'must have at most 20 entries';
const MAX_ADDITIONAL_ALLOWED_COMMANDS = 20;
const canonicalPathPattern = /^(?!\/)(?!\\)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.?(?:\/|$))(?!.*\/\/)(?!.*\/$).+$/;
const shellOperatorPattern = /[;&|`<>\r\n]|\$\(/;
const percentage = z.int().check(z.minimum(0), z.maximum(100));
const positiveInt = z.int().check(z.positive());

type CustomIssue = { code: 'custom'; path: PropertyKey[]; input: unknown; message: string };

function isCanonicalRelativeFilePath(value: string): boolean {
  if (value === '.' || value.endsWith('/')) return false;
  const segments = value.split('/');
  for (const segment of segments) if (segment === '' || segment === '.' || segment === '..') return false;
  return segments.length > 0;
}
function isUnique<T>(values: T[]): boolean { return new Set(values).size === values.length; }
function isUniqueCanonicalPath(values: string[]): boolean { return new Set(values.map((value) => value.split('/').join('/'))).size === values.length; }
function addIssue(ctx: z.core.ParsePayload, issue: CustomIssue): void { ctx.issues.push(issue); }
function uniqueCheck<T>(message: string): (ctx: z.core.ParsePayload<T[]>) => void {
  return (ctx) => { if (!isUnique(ctx.value)) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message }); };
}
function canonicalPathUniqueCheck(ctx: z.core.ParsePayload<string[]>): void {
  if (!isUniqueCanonicalPath(ctx.value)) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: DUPLICATE_PATHS_RULE });
}

const relativePath = z.string().check(z.minLength(1), z.regex(canonicalPathPattern, CANONICAL_PATH_RULE), (ctx) => {
  if (!isCanonicalRelativeFilePath(ctx.value)) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: CANONICAL_PATH_RULE });
});
const additionalAllowedCommand = z.string().check(z.minLength(1), (ctx) => {
  if (ctx.value.trim() !== ctx.value) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: TRIMMED_RULE });
  if (shellOperatorPattern.test(ctx.value)) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: SHELL_OPERATOR_RULE });
});
const additionalAllowedCommandsSchema = z.array(additionalAllowedCommand).check(z.maxLength(MAX_ADDITIONAL_ALLOWED_COMMANDS, ADDITIONAL_ALLOWED_COMMANDS_RULE), uniqueCheck(DUPLICATE_ENTRIES_RULE));

const brakeSchema = z.strictObject({ additionalAllowedCommands: z._default(additionalAllowedCommandsSchema, []) });
export const SNAPSHOT_TRIGGER_ZONES = ['YELLOW', 'RED'] as const;
export const MAX_AGENT_COMMAND_LENGTH = 200;
const MAX_DELEGATED_ENTRIES = 20;
const DELEGATED_ENTRIES_RULE = `must have at most ${MAX_DELEGATED_ENTRIES} entries`;
const SKILL_NAME_RULE = 'must be a skill name made of letters, digits, colons, dots, underscores, or hyphens';
const SINGLE_LINE_RULE = 'must be a single line';
const skillNamePattern = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;
const agentCommand = z.string().check(z.minLength(1), z.maxLength(MAX_AGENT_COMMAND_LENGTH), (ctx) => {
  if (ctx.value.trim() !== ctx.value) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: TRIMMED_RULE });
  if (/[\r\n]/.test(ctx.value)) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: SINGLE_LINE_RULE });
});
const allowedPathsSchema = z.array(relativePath).check(z.maxLength(MAX_DELEGATED_ENTRIES, DELEGATED_ENTRIES_RULE), canonicalPathUniqueCheck);
const allowedSkillsSchema = z.array(z.string().check(z.regex(skillNamePattern, SKILL_NAME_RULE))).check(z.maxLength(MAX_DELEGATED_ENTRIES, DELEGATED_ENTRIES_RULE), uniqueCheck(DUPLICATE_ENTRIES_RULE));
export const delegatedSnapshotSchema = z.strictObject({ snapshotCommand: agentCommand, triggerZone: z._default(z.enum(SNAPSHOT_TRIGGER_ZONES), 'RED'), resumeCommand: z.optional(agentCommand), allowedPaths: z._default(allowedPathsSchema, []), allowedSkills: z._default(allowedSkillsSchema, []) });
export type DelegatedSnapshotConfig = z.infer<typeof delegatedSnapshotSchema>;
export const zonesSchema = z.strictObject({ greenMaxPercentage: percentage, yellowMaxPercentage: percentage, criticalPercentage: z.int().check(z.minimum(1), z.maximum(100)), greenMaxTurn: positiveInt, yellowMaxTurn: positiveInt, criticalTurn: positiveInt }).check((ctx) => {
  const zones = ctx.value;
  if (zones.greenMaxPercentage >= zones.yellowMaxPercentage) addIssue(ctx, { code: 'custom', path: ['yellowMaxPercentage'], input: zones.yellowMaxPercentage, message: 'must be greater than greenMaxPercentage' });
  if (zones.yellowMaxPercentage >= zones.criticalPercentage) addIssue(ctx, { code: 'custom', path: ['yellowMaxPercentage'], input: zones.yellowMaxPercentage, message: 'must be less than criticalPercentage' });
  if (zones.greenMaxTurn >= zones.yellowMaxTurn) addIssue(ctx, { code: 'custom', path: ['greenMaxTurn'], input: zones.greenMaxTurn, message: 'must be less than yellowMaxTurn' });
  if (zones.yellowMaxTurn >= zones.criticalTurn) addIssue(ctx, { code: 'custom', path: ['yellowMaxTurn'], input: zones.yellowMaxTurn, message: 'must be less than criticalTurn' });
});
const telemetrySchema = z.strictObject({ injectionMode: z.enum(INJECTION_MODES), activationThresholdPercentage: percentage, contextWindowCeiling: positiveInt, turnCeiling: positiveInt, zones: zonesSchema }).check((ctx) => {
  if (ctx.value.turnCeiling !== ctx.value.zones.criticalTurn) addIssue(ctx, { code: 'custom', path: ['turnCeiling'], input: ctx.value.turnCeiling, message: TURN_CEILING_RULE });
});
export const configurationSchema = z.strictObject({ $schema: z.optional(z.url()), schemaVersion: z.literal(1), activeHarnesses: z.array(z.enum(HARNESS_IDS)).check(uniqueCheck(DUPLICATE_ENTRIES_RULE)), telemetry: telemetrySchema, stateStorage: z.strictObject({ planFile: relativePath, checkpointFile: relativePath, instructCheckpointCommit: z.boolean(), bootMaxTokens: positiveInt }), instructionFiles: z.strictObject({ targets: z.array(relativePath).check(z.minLength(1), canonicalPathUniqueCheck), protocolFile: relativePath }), brake: z._default(brakeSchema, { additionalAllowedCommands: [] }), delegatedSnapshot: z.optional(delegatedSnapshotSchema), runner: z._default(runnerConfigurationSchema, { ...RUNNER_DEFAULTS }) });
export type ContextBrakeConfig = z.infer<typeof configurationSchema>;
export { HARNESS_IDS } from './harness.js';
export type { HarnessId } from './harness.js';
export const DEFAULT_CONFIG: ContextBrakeConfig = { $schema: 'https://unpkg.com/context-brake@1/schemas/context-brake.config.schema.json', schemaVersion: 1, activeHarnesses: [], telemetry: { injectionMode: 'threshold_only', activationThresholdPercentage: 50, contextWindowCeiling: 128000, turnCeiling: 12, zones: { greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 } }, stateStorage: { planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', instructCheckpointCommit: true, bootMaxTokens: 1000 }, instructionFiles: { targets: ['CLAUDE.md', 'AGENTS.md'], protocolFile: 'docs/context-brake-protocol.md' }, brake: { additionalAllowedCommands: [] }, runner: { ...RUNNER_DEFAULTS } };
