import { describe, expect, it } from 'vitest';
import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { assignFixGroups } from '../../src/core/services/fix-groups.js';
import { UNRECOGNIZED_KEYS_REMEDIATION } from '../../src/core/validation/configuration-validator.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { PiAdapter } from '../../src/infrastructure/harnesses/pi/adapter.js';
import { OhMyPiAdapter } from '../../src/infrastructure/harnesses/oh-my-pi/adapter.js';

const ADAPTERS: readonly HarnessAdapter[] = [new ClaudeAdapter(), new PiAdapter(), new OhMyPiAdapter()];

type FindingInput = { readonly code: string; readonly harness?: HarnessId | null; readonly severity?: DiagnosticFinding['severity']; readonly remediation?: string | null };

function finding(input: FindingInput): DiagnosticFinding {
  return { code: input.code, severity: input.severity ?? 'warning', scope: 'project', harness: input.harness ?? null, path: null, message: 'm', impact: null, remediation: input.remediation ?? null };
}

function groupOf(input: FindingInput): string | undefined {
  return assignFixGroups([finding(input)], ADAPTERS)[0]?.fix?.group;
}

const CORE_TABLE: readonly [string, string][] = [
  ['ASSET_MISSING', 'automatic'], ['ASSET_OUTDATED', 'automatic'], ['INTEGRATION_MISSING', 'automatic'], ['CONFIG_MISSING', 'automatic'], ['LEGACY_TURN_LIMITS', 'automatic'],
  ['ASSET_MODIFIED', 'decision'], ['NO_PROJECT_HARNESS', 'decision'],
  ['VERSION_FLOOR_UNVERIFIED', 'manual'], ['INVALID_HARNESS_CONFIG', 'manual'], ['RUNTIME_ERRORS_RECORDED', 'manual'], ['CODEX_ROOT_NOT_GIT_TOPLEVEL', 'manual'],
];

const CLAUDE_TABLE: readonly [string, string][] = [
  ['STATUSLINE_BRIDGE_OUTDATED', 'automatic'], ['STATUSLINE_BRIDGE_MISSING_SCRIPT', 'automatic'], ['STATUSLINE_STATE_INVALID', 'automatic'],
  ['STATUSLINE_PREVIOUS_CHANGED', 'automatic'], ['STATUSLINE_BRIDGE_ABSENT', 'automatic'], ['AUTO_RESTART_OUTDATED_MOD', 'automatic'],
  ['STATUSLINE_BRIDGE_INACTIVE', 'decision'],
  ['AUTO_RESTART_CLAUDE_TOO_OLD', 'manual'], ['AUTO_RESTART_NOT_LOADED', 'manual'], ['AUTO_RESTART_LAST_SKIP', 'manual'], ['CONTEXT_MOD_SILENT', 'manual'],
  ['STATUSLINE_POWERSHELL_FALLBACK', 'manual'], ['STATUSLINE_LOCAL_TRACKED', 'manual'], ['ASSET_OUTDATED', 'automatic'],
];

describe('fix group assignment (FR-01, TC-01)', () => {
  it.each(CORE_TABLE)('gives %s the %s group from the core map', (code, group) => {
    expect(groupOf({ code })).toBe(group);
  });
  it.each(CLAUDE_TABLE)('gives the claude-code finding %s the %s group', (code, group) => {
    expect(groupOf({ code, harness: 'claude-code' })).toBe(group);
  });
  it.each(['pi', 'oh-my-pi'] as const)('gives AUTO_RESTART_OUTDATED_MOD of %s the automatic group', (harness) => {
    expect(groupOf({ code: 'AUTO_RESTART_OUTDATED_MOD', harness })).toBe('automatic');
  });
  it('keeps a claude-code code manual for another harness', () => {
    expect(groupOf({ code: 'STATUSLINE_BRIDGE_INACTIVE', harness: 'codex-cli' })).toBe('manual');
  });
  it('gives error findings a group and removes the fix field from ok findings', () => {
    expect(groupOf({ code: 'INTEGRATION_MISSING', severity: 'error' })).toBe('automatic');
    const ok = { ...finding({ code: 'AUTO_RESTART_OFF', severity: 'ok' }), fix: { group: 'automatic' as const } };
    expect(assignFixGroups([ok], ADAPTERS)[0]).not.toHaveProperty('fix');
  });
});

describe('fix group of INVALID_CONTEXTBRAKE_CONFIG (FR-01, TC-02)', () => {
  it('is automatic when the only cause is unrecognized keys', () => {
    expect(groupOf({ code: 'INVALID_CONTEXTBRAKE_CONFIG', severity: 'error', remediation: UNRECOGNIZED_KEYS_REMEDIATION })).toBe('automatic');
  });
  it('is manual for a syntax error', () => {
    expect(groupOf({ code: 'INVALID_CONTEXTBRAKE_CONFIG', severity: 'error', remediation: 'Fix syntax or structure in context-brake.config.json.' })).toBe('manual');
  });
});
