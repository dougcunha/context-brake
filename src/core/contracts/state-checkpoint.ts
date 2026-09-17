import { z } from 'zod/mini';
import { stepIdSchema } from './task-plan.js';

export const CHECKPOINT_SCHEMA_VERSION = 1;

const TIMESTAMP_RULE = 'must be an ISO 8601 date-time';

type CustomIssue = { code: 'custom'; path: PropertyKey[]; input: unknown; message: string };

function addIssue(ctx: z.core.ParsePayload, issue: CustomIssue): void {
  ctx.issues.push(issue);
}

const nonEmptyText = z.string().check(z.minLength(1));
const timestampSchema = z.string().check(z.minLength(1), (ctx) => {
  if (Number.isNaN(Date.parse(ctx.value))) addIssue(ctx, { code: 'custom', path: [], input: ctx.value, message: TIMESTAMP_RULE });
});

export const gitStateSchema = z.strictObject({
  branch: z.nullable(z.string()),
  lastCommitHash: z.nullable(z.string()),
  cleanWorkingTree: z.nullable(z.boolean()),
});

export const workingMemorySchema = z.strictObject({
  discoveredConstraints: z._default(z.array(z.string()), []),
  decisionsMade: z._default(z.array(z.string()), []),
  blockedItems: z._default(z.array(z.string()), []),
  breakingChanges: z._default(z.array(z.string()), []),
});

export const stateCheckpointSchema = z.strictObject({
  $schema: z.optional(z.string()),
  schemaVersion: z.literal(CHECKPOINT_SCHEMA_VERSION),
  taskId: nonEmptyText,
  activeStepId: z._default(z.nullable(stepIdSchema), null),
  gitState: gitStateSchema,
  workingMemory: workingMemorySchema,
  modifiedFiles: z._default(z.array(z.string()), []),
  timestamp: timestampSchema,
});

export type GitStateRecord = z.infer<typeof gitStateSchema>;
export type WorkingMemory = z.infer<typeof workingMemorySchema>;
export type StateCheckpoint = z.infer<typeof stateCheckpointSchema>;

export interface CheckpointStore {
  read(): Promise<StateCheckpoint>;
  write(checkpoint: StateCheckpoint): Promise<void>;
  exists(): Promise<boolean>;
}

export function hasRecordedGitState(checkpoint: StateCheckpoint): boolean {
  return checkpoint.gitState.lastCommitHash !== null;
}

export function countWorkingMemory(memory: WorkingMemory): number {
  return memory.discoveredConstraints.length + memory.decisionsMade.length + memory.blockedItems.length + memory.breakingChanges.length;
}
