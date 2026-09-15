import type { FileSnapshot, PlannedChange, PlanConflict } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import { detectEol, GITIGNORE_END_MARKER, parseIgnoreMarkers, renderIgnoreBlock } from './gitignore-markers.js';

export type GitignorePlanResult = {
  changes: readonly PlannedChange[];
  conflicts: readonly PlanConflict[];
};

export type GitignoreInstallInput = {
  snapshot: FileSnapshot;
  config: ContextBrakeConfig;
};

export type GitignoreRemovalInput = {
  snapshot: FileSnapshot;
  removeState: boolean;
};

const CREATE_SUMMARY = 'Create .gitignore with ContextBrake block';
const ADD_SUMMARY = 'Add ContextBrake block to .gitignore';
const UPDATE_SUMMARY = 'Update ContextBrake block in .gitignore';
const REMOVE_SUMMARY = 'Remove ContextBrake block from .gitignore';

function emptyResult(): GitignorePlanResult {
  return { changes: [], conflicts: [] };
}

type ChangeSpec = { kind: 'create' | 'update'; content: string; summary: string };

function planChange(snapshot: FileSnapshot, spec: ChangeSpec): PlannedChange {
  return { path: snapshot.path, realPath: snapshot.realPath, kind: spec.kind, owner: 'ignore_block', content: spec.content, preview: { summary: spec.summary } };
}

function markerConflict(path: string, state: { kind: 'duplicate' } | { kind: 'malformed'; reason: string }): PlanConflict {
  const code = state.kind === 'duplicate' ? 'DUPLICATE_GITIGNORE_MARKERS' : 'MALFORMED_GITIGNORE_MARKERS';
  const detail = state.kind === 'duplicate' ? 'Multiple ContextBrake ignore blocks' : state.reason;
  return { path, code, detail };
}

function appendBlock(content: string, target: string, eol: string): string {
  if (content === '') return target;
  const hasTrail = content.endsWith('\n');
  return `${content}${eol}${target}${hasTrail ? eol : ''}`;
}

function removeBlock(content: string, span: { start: number; end: number }): string {
  let before = content.slice(0, span.start);
  let after = content.slice(span.end + GITIGNORE_END_MARKER.length);
  if (before.endsWith('\r\n')) before = before.slice(0, -2);
  else if (before.endsWith('\n')) before = before.slice(0, -1);
  if (after.startsWith('\r\n')) after = after.slice(2);
  else if (after.startsWith('\n')) after = after.slice(1);
  if (!before) return after;
  if (!after) return before;
  return `${before}${detectEol(content)}${after}`;
}

function planExisting(snapshot: FileSnapshot, config: ContextBrakeConfig): GitignorePlanResult {
  const content = snapshot.content ?? '';
  const parsed = parseIgnoreMarkers(content);
  if (parsed.kind === 'duplicate' || parsed.kind === 'malformed') {
    return { changes: [], conflicts: [markerConflict(snapshot.path, parsed)] };
  }
  const eol = detectEol(content);
  const target = renderIgnoreBlock(config.stateStorage.planFile, config.stateStorage.checkpointFile, eol);
  if (parsed.kind === 'none') {
    const content = appendBlock(snapshot.content ?? '', target, eol);
    return { changes: [planChange(snapshot, { kind: 'update', content, summary: ADD_SUMMARY })], conflicts: [] };
  }
  const existing = content.slice(parsed.start, parsed.end + GITIGNORE_END_MARKER.length);
  if (existing === target) return emptyResult();
  const updated = `${content.slice(0, parsed.start)}${target}${content.slice(parsed.end + GITIGNORE_END_MARKER.length)}`;
  return { changes: [planChange(snapshot, { kind: 'update', content: updated, summary: UPDATE_SUMMARY })], conflicts: [] };
}

export function planGitignoreInstall(input: GitignoreInstallInput): GitignorePlanResult {
  if (!input.snapshot.exists) {
    const content = `${renderIgnoreBlock(input.config.stateStorage.planFile, input.config.stateStorage.checkpointFile, '\n')}\n`;
    return { changes: [planChange(input.snapshot, { kind: 'create', content, summary: CREATE_SUMMARY })], conflicts: [] };
  }
  return planExisting(input.snapshot, input.config);
}

export function planGitignoreRemoval(input: GitignoreRemovalInput): GitignorePlanResult {
  if (!input.removeState || !input.snapshot.exists) return emptyResult();
  const content = input.snapshot.content ?? '';
  const parsed = parseIgnoreMarkers(content);
  if (parsed.kind === 'none') return emptyResult();
  if (parsed.kind === 'duplicate' || parsed.kind === 'malformed') {
    return { changes: [], conflicts: [markerConflict(input.snapshot.path, parsed)] };
  }
  const remaining = removeBlock(content, parsed);
  if (remaining.trim() === '') {
    const change: PlannedChange = { path: input.snapshot.path, realPath: input.snapshot.realPath, kind: 'delete', owner: 'ignore_block', content: null, preview: { summary: 'Delete .gitignore' } };
    return { changes: [change], conflicts: [] };
  }
  return { changes: [planChange(input.snapshot, { kind: 'update', content: remaining, summary: REMOVE_SUMMARY })], conflicts: [] };
}
