import { isAbsolute, relative, resolve } from 'node:path';
import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import { MANIFEST_RELATIVE_PATH } from '../contracts/manifest.js';
import { applyIgnoreBlock, removeIgnoreBlock, type BlockResult } from './gitignore-block.js';

export const GITIGNORE_PATH = '.gitignore';
export const MALFORMED_MARKERS_CODE = 'GITIGNORE_MARKERS_MALFORMED';
export const NO_GIT_CODE = 'GITIGNORE_NO_GIT';
const CONFIG_PATH = 'context-brake.config.json';
const SUMMARY = "Keep ContextBrake's files out of Git";
const SPECIAL_CHARACTERS = /[\\*?[]/g;

export type OwnedPath = { readonly path: string; readonly realPath: string };
export type GitIgnorePlan = { readonly change: PlannedChange | null; readonly conflicts: readonly PlanConflict[]; readonly findings: readonly DiagnosticFinding[]; readonly paths: readonly string[] };
export type GitIgnoreInput = {
  readonly enabled: boolean;
  readonly insideGit: boolean;
  readonly paths: readonly string[];
  readonly snapshot: FileSnapshot | undefined;
};

function escapeLine(path: string): string {
  return `/${path.replace(SPECIAL_CHARACTERS, '\\$&').replace(/ $/, '\\ ')}`;
}

function projectRelative(root: string, realPath: string): string | null {
  const path = relative(root, realPath).replaceAll('\\', '/');
  return path === '' || path.startsWith('..') || isAbsolute(path) ? null : path;
}

export function ownedPathsFor(root: string, assetPaths: readonly string[], locate: (path: string) => string): string[] {
  const owned = [CONFIG_PATH, MANIFEST_RELATIVE_PATH, ...assetPaths];
  const locations = owned.flatMap((path) => [resolve(root, path), locate(path)]);
  const relatives = locations.map((location) => projectRelative(root, location)).filter((path): path is string => path !== null);
  return [...new Set(relatives)].sort();
}

function noGitFinding(): DiagnosticFinding {
  return { code: NO_GIT_CODE, severity: 'ok', scope: 'project', harness: null, path: GITIGNORE_PATH, message: 'This folder is not inside a Git working tree, so ContextBrake did not write a .gitignore block.', impact: null, remediation: 'Run git init, then init again, to keep the ContextBrake files out of Git.' };
}

function nextContent(input: GitIgnoreInput, before: string | null): BlockResult {
  return input.enabled ? applyIgnoreBlock(before, input.paths.map(escapeLine)) : removeIgnoreBlock(before);
}

function changeKind(before: string | null, after: string | null): PlannedChange['kind'] {
  if (after === null) return 'delete';
  return before === null ? 'create' : 'update';
}

function changeFor(snapshot: FileSnapshot, before: string | null, after: string | null): PlannedChange | null {
  if (before === after) return null;
  const kind = changeKind(before, after);
  return { path: GITIGNORE_PATH, realPath: snapshot.realPath, kind, owner: 'gitignore', content: after, preview: { summary: SUMMARY } };
}

export type GitIgnoreInstall = {
  readonly root: string;
  readonly enabled: boolean;
  readonly insideGit: boolean;
  readonly hasInstall: boolean;
  readonly assetPaths: readonly string[];
  readonly changes: readonly PlannedChange[];
  readonly snapshots: readonly FileSnapshot[];
};

export function planGitIgnore(input: GitIgnoreInput): GitIgnorePlan {
  if (!input.insideGit) return { change: null, conflicts: [], findings: input.enabled ? [noGitFinding()] : [], paths: [] };
  if (input.snapshot === undefined) return { change: null, conflicts: [], findings: [], paths: [] };
  const before = input.snapshot.exists ? input.snapshot.content : null;
  const result = nextContent(input, before);
  const paths = input.enabled ? input.paths : [];
  if ('error' in result) return { change: null, conflicts: [{ path: GITIGNORE_PATH, code: MALFORMED_MARKERS_CODE, detail: result.error }], findings: [], paths };
  return { change: changeFor(input.snapshot, before, result.content), conflicts: [], findings: [], paths };
}

const RUNTIME_PREFIX = '.context-brake/runtime/';

export function runtimeStatePaths(changes: readonly PlannedChange[], snapshots: readonly FileSnapshot[]): string[] {
  const deleted = new Set(changes.filter((change) => change.kind === 'delete').map((change) => change.path));
  const planned = changes.filter((change) => change.kind !== 'delete' && change.path.startsWith(RUNTIME_PREFIX)).map((change) => change.path);
  const existing = snapshots.filter((snapshot) => snapshot.exists && snapshot.path.startsWith(RUNTIME_PREFIX) && !deleted.has(snapshot.path)).map((snapshot) => snapshot.path);
  return [...new Set([...planned, ...existing])];
}

function locateOwned(input: GitIgnoreInstall, path: string): string {
  return input.changes.find((change) => change.path === path)?.realPath ?? input.snapshots.find((snapshot) => snapshot.path === path)?.realPath ?? resolve(input.root, path);
}

export function planGitIgnoreForInstall(input: GitIgnoreInstall): GitIgnorePlan {
  const paths = input.hasInstall ? ownedPathsFor(input.root, [...input.assetPaths, ...runtimeStatePaths(input.changes, input.snapshots)], (path) => locateOwned(input, path)) : [];
  return planGitIgnore({ enabled: input.enabled, insideGit: input.insideGit, paths, snapshot: input.snapshots.find((snapshot) => snapshot.path === GITIGNORE_PATH) });
}
