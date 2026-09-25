import type { ContextBrakeConfig } from '../contracts/configuration.js';
import type { CheckpointModeReport, DiagnosticFinding } from '../contracts/diagnostics.js';
import type { HarnessId } from '../contracts/harness.js';

const SKILL_AWARE_HARNESSES: ReadonlySet<HarnessId> = new Set(['claude-code']);
const CONFIG_PATH = 'context-brake.config.json';

export function checkpointModeReport(config: ContextBrakeConfig | null, planExists: boolean): CheckpointModeReport {
  const section = config?.delegatedSnapshot ?? null;
  if (section === null) return { effective: 'plan', reason: 'no_section', delegatedSnapshot: null };
  return planExists ? { effective: 'plan', reason: 'plan_present', delegatedSnapshot: section } : { effective: 'delegated', reason: 'plan_missing', delegatedSnapshot: section };
}
export function delegatedSnapshotFindings(config: ContextBrakeConfig | null, harnesses: readonly HarnessId[]): DiagnosticFinding[] {
  const section = config?.delegatedSnapshot;
  if (section === undefined) return [];
  const pathFindings = section.allowedPaths.length > 0 ? [] : [noPathsFinding()];
  return [...pathFindings, ...harnesses.filter((harness) => !SKILL_AWARE_HARNESSES.has(harness)).map(unrecognizedSkillFinding)];
}
function noPathsFinding(): DiagnosticFinding {
  return {
    code: 'DELEGATED_SNAPSHOT_NO_PATHS', severity: 'warning', scope: 'project', harness: null, path: CONFIG_PATH,
    message: 'The delegated snapshot section allows no file paths above the critical ceiling.',
    impact: 'Above the critical ceiling, the brake blocks every file the snapshot command reads or writes.',
    remediation: 'Add the snapshot files with context-brake init --snapshot-path "<pattern>".',
  };
}
function unrecognizedSkillFinding(harness: HarnessId): DiagnosticFinding {
  return {
    code: 'DELEGATED_SKILL_UNRECOGNIZED', severity: 'ok', scope: 'harness', harness, path: null,
    message: `${harness} does not report skill invocations as tool calls, so the brake cannot allow the snapshot skill by name.`,
    impact: 'Above the critical ceiling, only the allowed paths and commands stay available to the snapshot command.',
    remediation: 'List every file the snapshot command reads or writes in delegatedSnapshot.allowedPaths.',
  };
}
