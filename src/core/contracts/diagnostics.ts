import { z } from 'zod';
import { CHANGE_OWNERS } from './changes.js';
import { configurationSchema } from './configuration.js';
import { CAPABILITY_IDS, CAPABILITY_STATES, DETECTION_ORIGINS, DETECTION_STATES, HARNESS_IDS, SUPPORT_LEVELS } from './harness.js';

const severity = z.enum(['ok', 'warning', 'error']);
const finding = z.object({ code: z.string().regex(/^[A-Z0-9_]+$/), severity, scope: z.enum(['project', 'harness', 'file', 'performance']), harness: z.enum(HARNESS_IDS).nullable(), path: z.string().nullable(), message: z.string(), impact: z.string().nullable(), remediation: z.string().nullable() }).strict();
export const diagnosticFindingSchema = finding;
const detection = z.object({ harness: z.enum(HARNESS_IDS), state: z.enum(DETECTION_STATES), evidence: z.array(z.object({ origin: z.enum(DETECTION_ORIGINS), kind: z.string(), value: z.string() }).strict()), selectedExplicitly: z.boolean(), version: z.string().nullable(), versionSource: z.enum(['executable', 'config']).nullable() }).strict();
const capability = z.object({ id: z.enum(CAPABILITY_IDS), state: z.enum(CAPABILITY_STATES) }).strict();
const limitation = z.object({ capability: z.enum(CAPABILITY_IDS), impact: z.string() }).strict();
const profile = z.object({ harness: z.enum(HARNESS_IDS), supportLevel: z.enum(SUPPORT_LEVELS), minimumVersion: z.string().nullable(), capabilities: z.array(capability), limitations: z.array(limitation) }).strict();
const overhead = z.object({ harness: z.enum(HARNESS_IDS), executionModel: z.enum(['process', 'in_process']), sampleCount: z.number().int().nonnegative(), p95Milliseconds: z.number().nonnegative().nullable(), targetMilliseconds: z.union([z.literal(100), z.literal(15)]), status: z.enum(['pass', 'fail', 'unavailable']) }).strict();
const integration = z.object({ harness: z.enum(HARNESS_IDS), state: z.enum(['installed', 'missing', 'broken']), version: z.string().nullable(), support: profile, overhead: overhead.nullable() }).strict();
const preview = z.object({ summary: z.string(), startLine: z.number().int().positive().optional(), endLine: z.number().int().positive().optional(), snippet: z.string().optional() }).strict();
const fileChange = z.object({ path: z.string(), realPath: z.string(), kind: z.enum(['create', 'update', 'delete']), owner: z.enum(CHANGE_OWNERS), beforeSha256: z.string().nullable(), afterSha256: z.string().nullable(), preview }).strict();
const conflict = z.object({ path: z.string(), code: z.string().regex(/^[A-Z0-9_]+$/), detail: z.string() }).strict();
const harnessPlan = z.object({ harness: z.enum(HARNESS_IDS), outcome: z.enum(['planned', 'skipped', 'conflict']), supportLevel: z.enum(SUPPORT_LEVELS), limitations: z.array(limitation) }).strict();
const outcome = z.object({ path: z.string(), status: z.enum(['planned', 'applied', 'unchanged', 'skipped', 'failed']), detail: z.string().nullable() }).strict();
const plan = z.object({ schemaVersion: z.literal(1), projectRoot: z.string(), changes: z.array(fileChange), conflicts: z.array(conflict), harnesses: z.array(harnessPlan), requiresConfirmation: z.boolean() }).strict();
export const installReportSchema = z.object({ schemaVersion: z.literal(1), command: z.enum(['init', 'remove']), mode: z.enum(['dry_run', 'applied']), status: z.enum(['success', 'warnings', 'errors']), exitCode: z.union([z.literal(0), z.literal(1), z.literal(2)]), detections: z.array(detection), plan, outcomes: z.array(outcome), findings: z.array(finding) }).strict();
export const doctorReportSchema = z.object({ schemaVersion: z.literal(1), command: z.literal('doctor'), status: z.enum(['healthy', 'warnings', 'errors']), exitCode: z.union([z.literal(0), z.literal(1), z.literal(2)]), detections: z.array(detection), integrations: z.array(integration), findings: z.array(finding) }).strict();
const stepStatus = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']);
const statusStep = z.object({ id: z.union([z.string(), z.number().int()]), title: z.string(), status: stepStatus }).strict();
const statusPlan = z.object({ taskId: z.string(), title: z.string(), currentStepId: z.union([z.string(), z.number().int()]).nullable(), activeStep: statusStep.nullable(), steps: z.array(statusStep) }).strict();
const statusCheckpoint = z.object({ timestamp: z.string().nullable(), lastCommitHash: z.string().nullable(), branch: z.string().nullable(), constraintsCount: z.number().int().nonnegative(), decisionsCount: z.number().int().nonnegative() }).strict();
const statusFileIssues = z.object({ path: z.string(), rule: z.string() }).strict();
const statusFileValidity = z.object({ path: z.string(), exists: z.boolean(), valid: z.boolean(), issues: z.array(statusFileIssues) }).strict();
const statusFiles = z.object({ plan: statusFileValidity, checkpoint: statusFileValidity }).strict();
const gitDivergence = z.union([
  z.object({ kind: z.literal('checks_omitted'), reason: z.string() }).strict(),
  z.object({ kind: z.literal('missing_commit'), recordedCommit: z.string() }).strict(),
  z.object({ kind: z.literal('outside_history'), recordedCommit: z.string(), currentCommit: z.string().nullable() }).strict(),
  z.object({ kind: z.literal('pending_changes') }).strict(),
  z.object({ kind: z.literal('branch_changed'), recordedBranch: z.string(), currentBranch: z.string().nullable() }).strict(),
]);
const statusGit = z.object({ status: z.enum(['available', 'unavailable']), branch: z.string().nullable(), headCommit: z.string().nullable(), cleanWorkingTree: z.boolean().nullable(), divergences: z.array(gitDivergence) }).strict();
export const planStatusReportSchema = z.object({
  schemaVersion: z.literal(1), command: z.literal('plan'), subcommand: z.literal('status'),
  status: z.enum(['healthy', 'warnings', 'errors']), exitCode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  plan: statusPlan.nullable(), checkpoint: statusCheckpoint.nullable(), files: statusFiles, findings: z.array(finding), git: statusGit.nullable().optional(),
}).strict();
const cliErrorBase = { schemaVersion: z.literal(1), command: z.enum(['init', 'remove', 'doctor', 'plan']), status: z.literal('error'), error: z.object({ message: z.string() }).strict() };
export const cliErrorSchema = z.union([
  z.object({ ...cliErrorBase, exitCode: z.literal(64), error: z.object({ code: z.literal('INVALID_ARGUMENTS'), message: z.string() }).strict() }).strict(),
  z.object({ ...cliErrorBase, exitCode: z.literal(130), error: z.object({ code: z.literal('INTERRUPTED'), message: z.string() }).strict() }).strict(),
  z.object({ ...cliErrorBase, exitCode: z.literal(2), error: z.object({ code: z.enum(['INVALID_CONTEXTBRAKE_CONFIG', 'CONFIRMATION_REQUIRED', 'UNEXPECTED_ERROR']), message: z.string() }).strict() }).strict(),
]);
export type DiagnosticFinding = z.infer<typeof diagnosticFindingSchema>;
export type DoctorReport = z.infer<typeof doctorReportSchema>;
export type PlanStatusReport = z.infer<typeof planStatusReportSchema>;
export type InstallReport = z.infer<typeof installReportSchema>;
export type CliErrorDocument = z.infer<typeof cliErrorSchema>;
export type OverheadMeasurement = z.infer<typeof overhead>;
export type HarnessDiagnostic = z.infer<typeof integration>;
export interface OverheadMeasurer {
  measure(harness: (typeof HARNESS_IDS)[number]): Promise<OverheadMeasurement>;
}
export { configurationSchema };
