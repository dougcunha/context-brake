import { describe, expect, it } from 'vitest';
import type { DoctorReport } from '../../src/core/contracts/diagnostics.js';
import type { FixOutcomeItem, FixReport } from '../../src/core/contracts/fix-report.js';
import { fixSummary, formatFixReport } from '../../src/cli/output/fix-text.js';
import { restartNote } from '../../src/cli/output/harness-labels.js';
import { PLAIN_STYLE } from '../../src/cli/output/style.js';

const DOCTOR: DoctorReport = { schemaVersion: 1, command: 'doctor', status: 'healthy', exitCode: 0, detections: [], integrations: [], findings: [] };
const MOD_FIXED: FixOutcomeItem = { code: 'AUTO_RESTART_OUTDATED_MOD', harness: 'claude-code', path: '.claude/settings.local.json', group: 'automatic', outcome: 'fixed', detail: restartNote('claude-code') };
const DECISION: FixOutcomeItem = { code: 'ASSET_MODIFIED', harness: 'claude-code', path: 'a.mjs', group: 'decision', outcome: 'skipped', detail: 'You kept the modified file.' };

function fixReport(overrides: Partial<FixReport>): FixReport {
  return { schemaVersion: 1, command: 'fix', mode: 'applied', stopped: null, status: 'healthy', exitCode: 0, plan: { changes: [], conflicts: [] }, outcomes: [MOD_FIXED], doctor: DOCTOR, ...overrides };
}

describe('fix text (FR-09, FR-10, DEC-12, TC-17)', () => {
  it('prints the restart note under a fixed mod', () => {
    const text = formatFixReport(fixReport({}), PLAIN_STYLE);
    expect(text).toMatch(/FIXED\s+AUTO_RESTART_OUTDATED_MOD/);
    expect(text).toContain('Restart Claude Code to load the new mod.');
    expect(text.trimEnd().split('\n').at(-1)).toBe('ContextBrake doctor: OK (no problems found)');
  });
  it('names the plan change with the code of the finding at the same path', () => {
    const change = { path: '.claude/settings.local.json', kind: 'update' as const, owner: 'harness_entry' as const, summary: 'Register the mod' };
    expect(formatFixReport(fixReport({ plan: { changes: [change], conflicts: [] } }), PLAIN_STYLE)).toMatch(/update\s+\.claude\/settings\.local\.json\s+AUTO_RESTART_OUTDATED_MOD/);
  });
  it('counts groups with singular and plural verbs', () => {
    expect(fixSummary([MOD_FIXED, DECISION])).toBe('1 fixable, 1 needs a decision, 0 manual');
    expect(fixSummary([DECISION, DECISION])).toBe('0 fixable, 2 need a decision, 0 manual');
  });
  it('marks a dry run and a stop without a plan', () => {
    expect(formatFixReport(fixReport({ mode: 'dry_run' }), PLAIN_STYLE)).toContain('Dry run: no file was changed.');
    expect(formatFixReport(fixReport({ stopped: 'nothing_to_fix' }), PLAIN_STYLE).split('\n')[0]).toBe('ContextBrake fix: nothing can be fixed automatically');
    expect(formatFixReport(fixReport({ stopped: 'not_installed' }), PLAIN_STYLE)).toContain('Run context-brake init first.');
  });
  it('uses the harness id when no label is known', () => {
    expect(restartNote('codex-cli')).toBe('Restart codex-cli to load the new mod.');
    expect(restartNote(null)).toBe('Restart the harness to load the new mod.');
  });
});
