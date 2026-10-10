import { describe, expect, it } from 'vitest';
import { softenDefaultConflict } from '../../src/infrastructure/harnesses/claude-code/statusline-default.js';

const LOCAL = '.claude/settings.local.json';
const UNSUPPORTED = { path: LOCAL, code: 'STATUSLINE_UNSUPPORTED_PATH', detail: 'The repository path contains ", `, $, or \\, which the status line command cannot quote safely.' };
const UNPARSEABLE = { path: LOCAL, code: 'INVALID_HARNESS_CONFIG', detail: 'bad json' };

describe('default bridge conflicts become warnings (prd-09 FR-04, DEC-08, TC-09, codereview_01 CR-01)', () => {
  it('turns the unsupported-path conflict into a warning so a plain init still succeeds', () => {
    const plan = softenDefaultConflict({ changes: [], conflicts: [UNSUPPORTED], findings: [] });
    expect(plan.conflicts).toEqual([]);
    expect(plan.findings).toEqual([expect.objectContaining({ code: 'STATUSLINE_UNSUPPORTED_PATH', severity: 'warning', remediation: expect.stringContaining('context-brake init') })]);
  });
  it('turns an unparseable settings conflict into a STATUSLINE_SETTINGS_INVALID warning naming the file', () => {
    const plan = softenDefaultConflict({ changes: [], conflicts: [UNPARSEABLE], findings: [] });
    expect(plan).toEqual({ changes: [], conflicts: [], findings: [{
      code: 'STATUSLINE_SETTINGS_INVALID', severity: 'warning', scope: 'file', harness: 'claude-code', path: LOCAL,
      message: `${LOCAL} could not be parsed, so the status line bridge was not installed or updated: bad json`,
      impact: 'The status line bridge was not installed, so the brake only warns in Claude Code.', remediation: `Fix ${LOCAL}, then run context-brake init.`,
    }] });
  });
  it('returns a plan without conflicts unchanged', () => {
    const plan = { changes: [], conflicts: [], findings: [] };
    expect(softenDefaultConflict(plan)).toBe(plan);
  });
});
