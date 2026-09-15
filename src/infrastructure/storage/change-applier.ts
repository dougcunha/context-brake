import { readFile } from 'node:fs/promises';
import type { ApplyOutcome, ApplyReport, ChangeApplier, ChangePlan, FileChange } from '../../core/contracts/changes.js';
import { deleteFileIfExists, writeFileAtomically } from './atomic-writer.js';
import { pruneEmptyContextBrakeDirectories } from './directory-pruner.js';
import { computeSha256 } from './node-file-system.js';

export const FILE_CHANGED_CODE = 'FILE_CHANGED_SINCE_PREVIEW' as const;

async function checkPrecondition(change: FileChange): Promise<string | null> {
  try {
    const current = await readFile(change.realPath, 'utf8');
    const hash = await computeSha256(current);
    if (change.beforeSha256 === null) {
      return `${FILE_CHANGED_CODE}: file was created after plan was computed`;
    }
    if (hash !== change.beforeSha256) {
      return `${FILE_CHANGED_CODE}: expected ${change.beforeSha256}, found ${hash}`;
    }
    return null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      if (change.beforeSha256 !== null) {
        return `${FILE_CHANGED_CODE}: file was deleted after plan was computed`;
      }
      return null;
    }
    throw err;
  }
}

async function applySingleChange(change: FileChange): Promise<ApplyOutcome> {
  const mismatch = await checkPrecondition(change);
  if (mismatch) {
    return { path: change.path, status: 'failed', detail: mismatch };
  }
  if (change.kind === 'delete') {
    await deleteFileIfExists(change.realPath);
    return { path: change.path, status: 'applied', detail: null };
  }
  if (change.content === undefined || change.content === null) {
    return { path: change.path, status: 'failed', detail: 'Missing write content' };
  }
  if (change.beforeSha256 !== null && change.beforeSha256 === change.afterSha256) {
    return { path: change.path, status: 'unchanged', detail: null };
  }
  try {
    await writeFileAtomically(change.realPath, change.content);
    return { path: change.path, status: 'applied', detail: null };
  } catch (err) {
    return { path: change.path, status: 'failed', detail: (err as Error).message };
  }
}

export type ChangeApplierOptions = {
  removeState?: boolean | undefined;
};

export class NodeChangeApplier implements ChangeApplier {
  private readonly options?: ChangeApplierOptions | undefined;

  constructor(options?: ChangeApplierOptions) {
    this.options = options;
  }

  async apply(plan: ChangePlan): Promise<ApplyReport> {
    const outcomes: ApplyOutcome[] = [];
    const appliedDeletePaths = new Set<string>();
    for (const change of plan.changes) {
      const outcome = await applySingleChange(change);
      outcomes.push(outcome);
      if (change.kind === 'delete' && outcome.status === 'applied') appliedDeletePaths.add(change.path);
    }
    const removeState = this.options?.removeState ?? plan.changes.some((c) => c.owner === 'runtime_state');
    outcomes.push(...await pruneEmptyContextBrakeDirectories({ root: plan.projectRoot, changes: plan.changes, appliedPaths: appliedDeletePaths, removeState }));
    for (const conflict of plan.conflicts) {
      outcomes.push({ path: conflict.path, status: 'skipped', detail: `${conflict.code}: ${conflict.detail}` });
    }
    const hasErrors = outcomes.some((o) => o.status === 'failed');
    const hasWarnings = outcomes.some((o) => o.status === 'skipped');
    if (hasErrors) {
      return { status: 'errors', exitCode: 2, outcomes };
    }
    if (hasWarnings) {
      return { status: 'warnings', exitCode: 1, outcomes };
    }
    return { status: 'success', exitCode: 0, outcomes };
  }
}
