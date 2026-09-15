import type { FileSnapshot } from '../contracts/changes.js';
import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import { detectEol, GITIGNORE_END_MARKER, parseIgnoreMarkers, renderIgnoreBlock } from './gitignore-markers.js';

const WARNING_IMPACT = 'Plan and checkpoint files can be committed accidentally.';
const WARNING_REMEDIATION = 'Run context-brake init --yes to add the ContextBrake block to .gitignore.';

function notIgnored(path: string, message: string): DiagnosticFinding {
  return { code: 'STATE_FILES_NOT_IGNORED', severity: 'warning', scope: 'file', harness: null, path, message, impact: WARNING_IMPACT, remediation: WARNING_REMEDIATION };
}

function malformed(path: string, reason: string): DiagnosticFinding {
  return {
    code: 'MALFORMED_GITIGNORE_MARKERS',
    severity: 'error',
    scope: 'file',
    harness: null,
    path,
    message: `The ContextBrake markers in ${path} are malformed: ${reason}.`,
    impact: 'ContextBrake cannot update the ignore block, so plan and checkpoint files can be committed accidentally.',
    remediation: `Remove or repair the ContextBrake markers in ${path}, then run context-brake init --yes.`,
  };
}

export function checkGitignore(snapshot: FileSnapshot, config: ContextBrakeConfig): DiagnosticFinding[] {
  if (!snapshot.exists) return [notIgnored(snapshot.path, `The ignore file ${snapshot.path} is missing, so plan and checkpoint files are not ignored.`)];
  const content = snapshot.content ?? '';
  const parsed = parseIgnoreMarkers(content);
  if (parsed.kind === 'duplicate') return [malformed(snapshot.path, 'multiple ContextBrake ignore blocks')];
  if (parsed.kind === 'malformed') return [malformed(snapshot.path, parsed.reason)];
  if (parsed.kind === 'none') return [notIgnored(snapshot.path, `The ContextBrake ignore block is missing in ${snapshot.path}, so plan and checkpoint files are not ignored.`)];
  const target = renderIgnoreBlock(config.stateStorage.planFile, config.stateStorage.checkpointFile, detectEol(content));
  if (content.slice(parsed.start, parsed.end + GITIGNORE_END_MARKER.length) === target) return [];
  return [notIgnored(snapshot.path, `The ContextBrake ignore block in ${snapshot.path} does not list the configured plan and checkpoint paths.`)];
}
