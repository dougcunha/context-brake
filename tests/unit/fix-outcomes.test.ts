import { describe, expect, it } from 'vitest';
import type { ApplyOutcome, ChangePlan } from '../../src/core/contracts/changes.js';
import type { DiagnosticFinding, DoctorReport } from '../../src/core/contracts/diagnostics.js';
import type { FixGroup } from '../../src/core/contracts/fix.js';
import { buildFixReport, findingKey, KEPT_STATUSLINE_REASON, NOT_INSTALLED_REASON, type FixRun } from '../../src/core/services/fix-outcomes.js';

type FindingInput = { readonly code: string; readonly group: FixGroup; readonly path?: string | null; readonly harness?: DiagnosticFinding['harness'] };

function finding(input: FindingInput): DiagnosticFinding {
  return { code: input.code, severity: 'warning', scope: 'harness', harness: input.harness ?? 'claude-code', path: input.path ?? null, message: `${input.code} message`, impact: null, remediation: `${input.code} remedy`, fix: { group: input.group } };
}

function report(findings: readonly DiagnosticFinding[]): DoctorReport {
  const exitCode = findings.length === 0 ? 0 : 1;
  return { schemaVersion: 1, command: 'doctor', status: exitCode === 0 ? 'healthy' : 'warnings', exitCode, detections: [], integrations: [], findings: [...findings] };
}

const OUTDATED = finding({ code: 'ASSET_OUTDATED', group: 'automatic', path: 'hook.mjs' });
const MODIFIED = finding({ code: 'ASSET_MODIFIED', group: 'decision', path: 'edited.mjs' });
const MANUAL = finding({ code: 'STATUSLINE_POWERSHELL_FALLBACK', group: 'manual' });
const MOD = finding({ code: 'AUTO_RESTART_OUTDATED_MOD', group: 'automatic', path: '.context-brake/claude-mod' });
const PLAN: ChangePlan = { schemaVersion: 1, projectRoot: '/repo', changes: [{ path: 'hook.mjs', realPath: '/repo/hook.mjs', kind: 'update', owner: 'runtime_asset', beforeSha256: 'a', afterSha256: 'b', preview: { summary: 'Install hook' } }], conflicts: [], harnesses: [], requiresConfirmation: true };

function run(overrides: Partial<FixRun>): FixRun {
  const before = overrides.before ?? report([OUTDATED, MODIFIED, MANUAL]);
  return {
    mode: 'applied', stopped: null, before, after: report([]), plan: PLAN, skipped: new Map(), applied: [], errorExitCode: 2,
    restartNote: (harness) => `Restart ${harness ?? 'the harness'} to load the new mod.`, ...overrides,
  };
}

function outcomes(value: FixRun): [string, string, string | null][] {
  return buildFixReport(value).outcomes.map((item) => [item.code, item.outcome, item.detail]);
}

describe('fix outcomes (FR-09, DEC-07, TC-08)', () => {
  it('reports fixed, skipped, and manual outcomes', () => {
    const skipped = new Map([[findingKey(MODIFIED), 'You kept the modified file.']]);
    expect(outcomes(run({ skipped }))).toEqual([['ASSET_OUTDATED', 'fixed', null], ['ASSET_MODIFIED', 'skipped', 'You kept the modified file.'], ['STATUSLINE_POWERSHELL_FALLBACK', 'manual', 'STATUSLINE_POWERSHELL_FALLBACK remedy']]);
  });
  it('reports a finding that is still reported as failed with its message', () => {
    expect(outcomes(run({ before: report([OUTDATED]), after: report([OUTDATED]) }))[0]).toEqual(['ASSET_OUTDATED', 'failed', 'Still reported after the fix: ASSET_OUTDATED message']);
  });
  it('reports the applier failure detail for the finding path', () => {
    const applied: ApplyOutcome[] = [{ path: 'hook.mjs', status: 'failed', detail: 'EACCES' }];
    expect(outcomes(run({ before: report([OUTDATED]), applied }))[0]).toEqual(['ASSET_OUTDATED', 'failed', 'EACCES']);
  });
  it('reports a restart-gated finding as fixed with the restart note, also when still reported (FR-10)', () => {
    expect(outcomes(run({ before: report([MOD]), after: report([MOD]) }))[0]).toEqual(['AUTO_RESTART_OUTDATED_MOD', 'fixed', 'Restart claude-code to load the new mod.']);
  });
  it('reports planned outcomes in a dry run and keeps the first diagnosis', () => {
    const value = buildFixReport(run({ mode: 'dry_run', before: report([OUTDATED]), after: report([OUTDATED]) }));
    expect([value.outcomes[0]?.outcome, value.doctor.findings.length, value.plan.changes[0]?.summary]).toEqual(['planned', 1, 'Install hook']);
  });
  it('skips the other status line findings when the inactive bridge is skipped (DEC-06)', () => {
    const inactive = finding({ code: 'STATUSLINE_BRIDGE_INACTIVE', group: 'decision', path: '.claude/settings.local.json' });
    const outdatedBridge = finding({ code: 'STATUSLINE_BRIDGE_OUTDATED', group: 'automatic' });
    const skipped = new Map([[findingKey(inactive), 'You skipped this decision.']]);
    expect(outcomes(run({ before: report([inactive, outdatedBridge]), skipped }))[1]).toEqual(['STATUSLINE_BRIDGE_OUTDATED', 'skipped', KEPT_STATUSLINE_REASON]);
  });
  it('skips every fixable finding when ContextBrake is not installed', () => {
    expect(outcomes(run({ stopped: 'not_installed', plan: null }))[0]).toEqual(['ASSET_OUTDATED', 'skipped', NOT_INSTALLED_REASON]);
  });
});

describe('fix exit codes (FR-13, DEC-08, TC-08)', () => {
  it('uses the final diagnosis after an applied run', () => {
    expect(buildFixReport(run({})).exitCode).toBe(0);
    expect(buildFixReport(run({ after: report([MANUAL]) }))).toMatchObject({ exitCode: 1, status: 'warnings' });
  });
  it('gives the error code when a change failed', () => {
    expect(buildFixReport(run({ applied: [{ path: 'x', status: 'failed', detail: 'EACCES' }] }))).toMatchObject({ exitCode: 2, status: 'errors' });
  });
  it('uses the first diagnosis for a dry run and a stopped run', () => {
    expect(buildFixReport(run({ mode: 'dry_run' })).exitCode).toBe(1);
    expect(buildFixReport(run({ stopped: 'nothing_to_fix', after: report([]) })).exitCode).toBe(1);
  });
});
