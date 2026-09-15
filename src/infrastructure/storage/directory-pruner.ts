import { lstat, readdir, rmdir } from 'node:fs/promises';
import { join, posix, relative, resolve } from 'node:path';
import type { ApplyOutcome, FileChange } from '../../core/contracts/changes.js';

const CONTEXT_BRAKE_DIR = '.context-brake';
const PRUNABLE_OWNERS = new Set(['manifest', 'runtime_state']);

export type PruneInput = {
  root: string;
  changes: readonly FileChange[];
  appliedPaths: ReadonlySet<string>;
  removeState: boolean;
};

type CandidateDirectory = { path: string; reportNonEmpty: boolean };

function normalize(path: string): string {
  return path.replace(/\\/g, '/');
}

async function collectRuntimeDirs(runtimeDir: string): Promise<string[]> {
  try {
    const entries = await readdir(runtimeDir, { recursive: true, withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => normalize(join(e.parentPath ?? (e as { path?: string }).path ?? runtimeDir, e.name)));
  } catch {
    return [];
  }
}

async function collectCandidateDirectories(input: PruneInput): Promise<CandidateDirectory[]> {
  const contextBrakeDir = normalize(resolve(input.root, CONTEXT_BRAKE_DIR));
  const dirs = new Map<string, boolean>();
  for (const change of input.changes) {
    if (change.kind !== 'delete' || !PRUNABLE_OWNERS.has(change.owner) || !input.appliedPaths.has(change.path)) continue;
    let current = posix.dirname(normalize(change.realPath));
    while (current.startsWith(contextBrakeDir)) {
      dirs.set(current, current === contextBrakeDir ? input.removeState : true);
      if (current === contextBrakeDir) break;
      current = posix.dirname(current);
    }
  }
  if (input.removeState) {
    const runtimeDir = normalize(resolve(input.root, '.context-brake/runtime'));
    dirs.set(runtimeDir, true);
    dirs.set(contextBrakeDir, true);
    for (const dir of await collectRuntimeDirs(runtimeDir)) dirs.set(dir, true);
  }
  return [...dirs.entries()]
    .map(([path, reportNonEmpty]) => ({ path, reportNonEmpty }))
    .sort((a, b) => b.path.length - a.path.length);
}

async function pruneDirectory(root: string, candidate: CandidateDirectory): Promise<ApplyOutcome | null> {
  const relPath = normalize(relative(root, candidate.path));
  const stats = await lstat(candidate.path).catch(() => null);
  if (!stats) return null;
  if (stats.isSymbolicLink()) return { path: relPath, status: 'skipped', detail: 'Directory is a symbolic link; pruning never follows it.' };
  const entries = await readdir(candidate.path).catch(() => null);
  if (entries === null) return null;
  if (entries.length > 0) {
    if (!candidate.reportNonEmpty) return null;
    return { path: relPath, status: 'skipped', detail: `Directory is not empty: ${entries.length} remaining entr${entries.length === 1 ? 'y' : 'ies'} ContextBrake did not delete.` };
  }
  try {
    await rmdir(candidate.path);
    return { path: relPath, status: 'applied', detail: null };
  } catch (err) {
    return { path: relPath, status: 'skipped', detail: (err as Error).message };
  }
}

export async function pruneEmptyContextBrakeDirectories(input: PruneInput): Promise<ApplyOutcome[]> {
  const outcomes: ApplyOutcome[] = [];
  const candidates = await collectCandidateDirectories(input);
  for (const candidate of candidates) {
    const outcome = await pruneDirectory(input.root, candidate);
    if (outcome) outcomes.push(outcome);
  }
  return outcomes;
}
