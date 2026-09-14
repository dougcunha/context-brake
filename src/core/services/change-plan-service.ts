import { createHash } from 'node:crypto';
import type { ChangePlan, FileChange, FileSnapshot, HarnessInstallPlan, PlannedChange, PlanConflict } from '../contracts/changes.js';

export type MergePlanInput = {
  projectRoot: string;
  plannedChanges: readonly PlannedChange[];
  conflicts?: readonly PlanConflict[];
  snapshots: readonly FileSnapshot[];
  harnesses?: readonly HarnessInstallPlan[];
};

export function hashString(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function normalizePath(p: string): string {
  const norm = p.replace(/\\/g, '/');
  return process.platform === 'win32' ? norm.toLowerCase() : norm;
}

function matchSnapshot(snapshots: readonly FileSnapshot[], realPath: string): FileSnapshot | undefined {
  const target = normalizePath(realPath);
  return snapshots.find((s) => normalizePath(s.realPath) === target);
}

function processPlannedChanges(planned: readonly PlannedChange[], snapshots: readonly FileSnapshot[]): { changes: FileChange[]; conflicts: PlanConflict[] } {
  const changes: FileChange[] = [];
  const conflicts: PlanConflict[] = [];
  const seen = new Map<string, PlannedChange>();
  for (const item of planned) {
    const key = normalizePath(item.realPath);
    const existing = seen.get(key);
    if (existing) {
      if (existing.content !== item.content || existing.kind !== item.kind) {
        conflicts.push({ path: item.path, code: 'CONFLICTING_CHANGES', detail: 'Multiple conflicting changes planned for target' });
      }
      continue;
    }
    seen.set(key, item);
    const snap = matchSnapshot(snapshots, item.realPath);
    if (!snap?.exists && item.kind === 'delete') continue;
    const beforeSha256 = snap?.exists ? snap.sha256 : null;
    const afterSha256 = item.kind === 'delete' || item.content === null ? null : hashString(item.content);
    if (beforeSha256 !== null && beforeSha256 === afterSha256) continue;
    changes.push({ path: item.path, realPath: item.realPath, kind: item.kind, owner: item.owner, beforeSha256, afterSha256, preview: item.preview, content: item.content });
  }
  return { changes, conflicts };
}

export function createChangePlan(input: MergePlanInput): ChangePlan {
  const { changes, conflicts } = processPlannedChanges(input.plannedChanges, input.snapshots);
  const allConflicts = [...(input.conflicts ?? []), ...conflicts];
  changes.sort((a, b) => a.path.localeCompare(b.path));
  allConflicts.sort((a, b) => a.path.localeCompare(b.path));
  const harnesses = [...(input.harnesses ?? [])].sort((a, b) => a.harness.localeCompare(b.harness));
  return {
    schemaVersion: 1,
    projectRoot: input.projectRoot,
    changes,
    conflicts: allConflicts,
    harnesses,
    requiresConfirmation: changes.length > 0,
  };
}
