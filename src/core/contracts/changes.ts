import { z } from 'zod';
import { HARNESS_IDS, SUPPORT_LEVELS, type HarnessId, type SupportLevel } from './harness.js';

export const CHANGE_KINDS = ['create', 'update', 'delete'] as const;
export const CHANGE_OWNERS = ['config', 'protocol', 'instruction_block', 'harness_entry', 'runtime_asset', 'manifest'] as const;
export const APPLY_STATUSES = ['planned', 'applied', 'unchanged', 'skipped', 'failed'] as const;
export const PLAN_OUTCOMES = ['planned', 'skipped', 'conflict'] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];
export type ChangeOwner = (typeof CHANGE_OWNERS)[number];
export type ApplyStatus = (typeof APPLY_STATUSES)[number];
export type PlanOutcome = (typeof PLAN_OUTCOMES)[number];

export type ChangePreview = { summary: string; startLine?: number; endLine?: number; snippet?: string };
export type FileChange = { path: string; realPath: string; kind: ChangeKind; owner: ChangeOwner; beforeSha256: string | null; afterSha256: string | null; preview: ChangePreview; content?: string | null };
export type PlannedChange = { path: string; realPath: string; kind: ChangeKind; owner: ChangeOwner; content: string | null; preview: ChangePreview };
export type FileSnapshot = { path: string; realPath: string; exists: boolean; content: string | null; sha256: string | null; isSymlink: boolean; fileIdentity: string };
export type PlanConflict = { path: string; code: string; detail: string };
export type HarnessInstallPlan = { harness: HarnessId; outcome: PlanOutcome; supportLevel: SupportLevel };
export type ChangePlan = { schemaVersion: 1; projectRoot: string; changes: readonly FileChange[]; conflicts: readonly PlanConflict[]; harnesses: readonly HarnessInstallPlan[]; requiresConfirmation: boolean };
export type ApplyOutcome = { path: string; status: ApplyStatus; detail: string | null };
export type ApplyReport = { status: 'success' | 'warnings' | 'errors'; exitCode: 0 | 1 | 2; outcomes: readonly ApplyOutcome[] };

export interface ChangeApplier {
  apply(plan: ChangePlan): Promise<ApplyReport>;
}

export const changePreviewSchema = z.object({ summary: z.string(), startLine: z.number().int().positive().optional(), endLine: z.number().int().positive().optional(), snippet: z.string().optional() }).strict();
export const fileChangeSchema = z.object({ path: z.string(), realPath: z.string(), kind: z.enum(CHANGE_KINDS), owner: z.enum(CHANGE_OWNERS), beforeSha256: z.string().nullable(), afterSha256: z.string().nullable(), preview: changePreviewSchema, content: z.string().nullable().optional() }).strict();
export const planConflictSchema = z.object({ path: z.string(), code: z.string().regex(/^[A-Z0-9_]+$/), detail: z.string() }).strict();
export const harnessInstallPlanSchema = z.object({ harness: z.enum(HARNESS_IDS), outcome: z.enum(PLAN_OUTCOMES), supportLevel: z.enum(SUPPORT_LEVELS) }).strict();
export const applyOutcomeSchema = z.object({ path: z.string(), status: z.enum(APPLY_STATUSES), detail: z.string().nullable() }).strict();
export const changePlanSchema = z.object({ schemaVersion: z.literal(1), projectRoot: z.string(), changes: z.array(fileChangeSchema), conflicts: z.array(planConflictSchema), harnesses: z.array(harnessInstallPlanSchema), requiresConfirmation: z.boolean() }).strict();
