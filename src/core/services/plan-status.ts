import type { DiagnosticFinding, PlanStatusReport } from '../contracts/diagnostics.js';
import type { GitInspector } from '../contracts/git.js';
import type { CheckpointStore, StateCheckpoint } from '../contracts/state-checkpoint.js';
import { findActiveStep, type PlanStore, type TaskPlan } from '../contracts/task-plan.js';
import { checkpointAgainstPlanIssues, InvalidCheckpointError } from '../validation/checkpoint-validator.js';
import { InvalidPlanError } from '../validation/plan-validator.js';
import { compareGitState } from './git-divergence.js';

export type PlanStatusInput = {
  readonly planFile: string;
  readonly checkpointFile: string;
  readonly planStore: PlanStore;
  readonly checkpointStore: CheckpointStore;
  readonly gitInspector?: GitInspector;
  readonly now?: Date;
};

async function readPlanSafely(store: PlanStore, exists: boolean): Promise<{ plan: TaskPlan | null; issues: { path: string; rule: string }[] }> {
  if (!exists) return { plan: null, issues: [] };
  try {
    return { plan: await store.read(), issues: [] };
  } catch (error) {
    if (error instanceof InvalidPlanError) return { plan: null, issues: error.issues.map((i) => ({ path: i.path, rule: i.rule })) };
    return { plan: null, issues: [{ path: '(unknown)', rule: error instanceof Error ? error.message : String(error) }] };
  }
}

async function readCheckpointSafely(store: CheckpointStore, exists: boolean): Promise<{ checkpoint: StateCheckpoint | null; issues: { path: string; rule: string }[] }> {
  if (!exists) return { checkpoint: null, issues: [] };
  try {
    return { checkpoint: await store.read(), issues: [] };
  } catch (error) {
    if (error instanceof InvalidCheckpointError) return { checkpoint: null, issues: error.issues.map((i) => ({ path: i.path, rule: i.rule })) };
    return { checkpoint: null, issues: [{ path: '(unknown)', rule: error instanceof Error ? error.message : String(error) }] };
  }
}

async function inspectGitSafely(inspector?: GitInspector, checkpoint?: StateCheckpoint | null, now = new Date(0)) {
  if (!inspector) return null;
  const recorded = checkpoint?.gitState.lastCommitHash ?? null;
  const current = await inspector.inspect(recorded);
  const comparison = compareGitState({
    recorded: checkpoint?.gitState ?? { branch: null, lastCommitHash: null, cleanWorkingTree: null },
    current,
    now,
  });

  return {
    status: current.status,
    branch: current.status === 'available' ? current.branch : null,
    headCommit: current.status === 'available' ? current.headCommit : null,
    cleanWorkingTree: current.status === 'available' ? current.cleanWorkingTree : null,
    divergences: [...comparison.divergences],
  };
}

function buildIssuesFindings(path: string, issues: readonly { path: string; rule: string }[]): DiagnosticFinding[] {
  return issues.map((issue) => ({
    code: 'INVALID_STATE_FILE',
    severity: 'error' as const,
    scope: 'file' as const,
    harness: null,
    path,
    message: `State file ${path} is invalid: ${issue.path} ${issue.rule}.`,
    impact: 'Harnesses cannot safely read state.',
    remediation: `Fix ${issue.path} in ${path}.`,
  }));
}

export async function buildPlanStatusReport(input: PlanStatusInput): Promise<PlanStatusReport> {
  const planExists = await input.planStore.exists();
  const checkpointExists = await input.checkpointStore.exists();
  const { plan, issues: planIssues } = await readPlanSafely(input.planStore, planExists);
  const { checkpoint, issues: cpIssues } = await readCheckpointSafely(input.checkpointStore, checkpointExists);
  if (plan && checkpoint) {
    cpIssues.push(...checkpointAgainstPlanIssues(checkpoint, plan).map((i) => ({ path: i.path, rule: i.rule })));
  }
  const findings = [...buildIssuesFindings(input.planFile, planIssues), ...buildIssuesFindings(input.checkpointFile, cpIssues)];
  const active = plan ? findActiveStep(plan) : null;
  const exitCode: 0 | 1 | 2 = findings.some((f) => f.severity === 'error') ? 2 : findings.some((f) => f.severity === 'warning') ? 1 : 0;
  return {
    schemaVersion: 1, command: 'plan', subcommand: 'status',
    status: exitCode === 2 ? 'errors' : exitCode === 1 ? 'warnings' : 'healthy', exitCode,
    plan: plan ? {
      taskId: plan.taskId, title: plan.title, currentStepId: plan.currentStepId,
      activeStep: active ? { id: active.id, title: active.title, status: active.status } : null,
      steps: plan.steps.map((s) => ({ id: s.id, title: s.title, status: s.status })),
    } : null,
    checkpoint: checkpoint ? {
      timestamp: checkpoint.timestamp, lastCommitHash: checkpoint.gitState.lastCommitHash, branch: checkpoint.gitState.branch,
      constraintsCount: checkpoint.workingMemory.discoveredConstraints.length, decisionsCount: checkpoint.workingMemory.decisionsMade.length,
    } : null,
    files: {
      plan: { path: input.planFile, exists: planExists, valid: planExists && planIssues.length === 0, issues: planIssues },
      checkpoint: { path: input.checkpointFile, exists: checkpointExists, valid: checkpointExists && cpIssues.length === 0, issues: cpIssues },
    },
    findings, git: await inspectGitSafely(input.gitInspector, checkpoint, input.now),
  };
}
