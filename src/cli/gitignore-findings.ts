import type { DiagnosticFinding } from '../core/contracts/diagnostics.js';

export const TRACKED_FILES_CODE = 'GITIGNORE_TRACKED_FILES';

export function trackedFilesFindings(tracked: readonly string[]): DiagnosticFinding[] {
  if (tracked.length === 0) return [];
  return [{
    code: TRACKED_FILES_CODE, severity: 'ok', scope: 'project', harness: null, path: '.gitignore',
    message: `Git already tracks ${tracked.length} ContextBrake file(s), so the .gitignore block does not hide them: ${tracked.join(', ')}.`,
    impact: 'Changes to these files keep showing in git status until Git stops tracking them.',
    remediation: `Run: git rm --cached -- ${tracked.join(' ')}`,
  }];
}
