import { countOccurrences } from './instruction-markers.js';

export const GITIGNORE_START_MARKER = '# CONTEXTBRAKE:START' as const;
export const GITIGNORE_END_MARKER = '# CONTEXTBRAKE:END' as const;

export type IgnoreMarkerState =
  | { kind: 'none' }
  | { kind: 'valid'; start: number; end: number }
  | { kind: 'duplicate' }
  | { kind: 'malformed'; reason: string };

const GITIGNORE_SPECIAL = /([*?[!#])/g;

export function escapeGitignorePath(path: string): string {
  const escaped = path.replace(GITIGNORE_SPECIAL, '\\$1');
  return escaped.endsWith(' ') ? `${escaped.slice(0, -1)}\\ ` : escaped;
}

export function renderIgnoreBlock(planFile: string, checkpointFile: string, eol = '\n'): string {
  const lines = [GITIGNORE_START_MARKER, `/${escapeGitignorePath(planFile)}`, `/${escapeGitignorePath(checkpointFile)}`, GITIGNORE_END_MARKER];
  return lines.join(eol);
}

export function detectEol(content: string): string {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

export function parseIgnoreMarkers(content: string): IgnoreMarkerState {
  const starts = countOccurrences(content, GITIGNORE_START_MARKER);
  const ends = countOccurrences(content, GITIGNORE_END_MARKER);
  if (starts === 0 && ends === 0) return { kind: 'none' };
  if (starts > 1 || ends > 1) return { kind: 'duplicate' };
  if (starts !== ends) return { kind: 'malformed', reason: 'Mismatched ContextBrake ignore markers' };
  const start = content.indexOf(GITIGNORE_START_MARKER);
  const end = content.indexOf(GITIGNORE_END_MARKER);
  if (start > end) return { kind: 'malformed', reason: 'Start marker after end marker' };
  return { kind: 'valid', start, end };
}
