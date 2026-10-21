import type { HarnessAdapter } from '../contracts/adapter.js';
import type { DiagnosticFinding } from '../contracts/diagnostics.js';
import type { FixGroup, FixGroupMap } from '../contracts/fix.js';
import { UNRECOGNIZED_KEYS_REMEDIATION } from '../validation/configuration-validator.js';

export const CORE_FIX_GROUPS: FixGroupMap = {
  ASSET_MISSING: 'automatic',
  ASSET_OUTDATED: 'automatic',
  INTEGRATION_MISSING: 'automatic',
  CONFIG_MISSING: 'automatic',
  LEGACY_TURN_LIMITS: 'automatic',
  ASSET_MODIFIED: 'decision',
  NO_PROJECT_HARNESS: 'decision',
};

const INVALID_CONFIG_CODE = 'INVALID_CONTEXTBRAKE_CONFIG';
const DEFAULT_GROUP: FixGroup = 'manual';

function coreGroup(finding: DiagnosticFinding): FixGroup | undefined {
  if (finding.code !== INVALID_CONFIG_CODE) return CORE_FIX_GROUPS[finding.code];
  return finding.remediation === UNRECOGNIZED_KEYS_REMEDIATION ? 'automatic' : 'manual';
}

function fixGroupOf(finding: DiagnosticFinding, adapters: readonly HarnessAdapter[]): FixGroup {
  const adapter = adapters.find((candidate) => candidate.id === finding.harness);
  return adapter?.fixGroups?.[finding.code] ?? coreGroup(finding) ?? DEFAULT_GROUP;
}

function withoutFix(finding: DiagnosticFinding): DiagnosticFinding {
  const copy = { ...finding };
  delete copy.fix;
  return copy;
}

export function assignFixGroups(findings: readonly DiagnosticFinding[], adapters: readonly HarnessAdapter[]): DiagnosticFinding[] {
  return findings.map((finding) => finding.severity === 'ok'
    ? withoutFix(finding)
    : { ...finding, fix: { group: fixGroupOf(finding, adapters) } });
}
