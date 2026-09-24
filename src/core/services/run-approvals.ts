import type { CommandForApproval } from '../contracts/run-ports.js';
import type { TaskPlan } from '../contracts/task-plan.js';
import type { RunContext } from './run-context.js';
import { listValidationCommands, unapprovedCommands } from './run-preflight.js';

export async function ensureCommandsApproved(context: RunContext, commands: readonly CommandForApproval[]): Promise<boolean> {
  const { deps } = context;
  const approvals = await deps.approvals.read();
  const pending = unapprovedCommands(commands, approvals);
  if (pending.length === 0) return true;
  if (!(await deps.commandApprover.approve(pending))) return false;
  const approvedAt = deps.clock.now().toISOString();
  const approved = [...approvals.approved, ...pending.map((command) => ({ hash: command.hash, stepId: command.stepId, approvedAt }))];
  await deps.approvals.write({ ...approvals, approved });
  deps.progress.onProgress({ kind: 'commands_approved', commands: pending });
  return true;
}

export async function ensurePlanApproved(context: RunContext, plan: TaskPlan): Promise<boolean> {
  return ensureCommandsApproved(context, listValidationCommands(plan, context.deps.hasher));
}
