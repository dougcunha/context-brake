import { describe, expect, it } from 'vitest';
import { renderModeLines } from '../../src/cli/output/doctor-mode-text.js';
import type { CheckpointModeReport } from '../../src/core/contracts/diagnostics.js';

const DEBUG_LINE = '  - debug mode: on\n';
const LIGHT_MODE: CheckpointModeReport = { effective: 'light', reason: 'light_mode', delegatedSnapshot: null, lightMode: { triggerZone: 'RED' } };
const PLAN_MODE: CheckpointModeReport = { effective: 'plan', reason: 'no_section', delegatedSnapshot: null };

describe('doctor mode lines (TC-10, FR-06, DEC-07)', () => {
  it('prints nothing without a checkpoint mode line or the debug mode', () => {
    expect(renderModeLines({ checkpointMode: PLAN_MODE })).toBe('');
  });

  it('prints the debug mode line when the report carries debugMode', () => {
    expect(renderModeLines({ checkpointMode: PLAN_MODE, debugMode: true })).toBe(DEBUG_LINE);
  });

  it('prints the checkpoint mode line before the debug mode line', () => {
    expect(renderModeLines({ checkpointMode: LIGHT_MODE, debugMode: true })).toBe(`  - checkpoint mode: light (trigger: RED)\n${DEBUG_LINE}`);
  });

  it('keeps the checkpoint mode line alone when debugMode is absent', () => {
    expect(renderModeLines({ checkpointMode: LIGHT_MODE })).toBe('  - checkpoint mode: light (trigger: RED)\n');
  });
});
