import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { CURRENT_END_MARKER, CURRENT_START_MARKER, referenceBlockFor } from '../../src/core/services/instruction-markers.js';

const REFERENCE_LINE = 'When `task_plan.json` exists or tool results include a ContextBrake telemetry block, follow `docs/context-brake-protocol.md`.';
const DEBUG_CONFIG = { ...DEFAULT_CONFIG, debug: true };
const BLOCK = [CURRENT_START_MARKER, REFERENCE_LINE, CURRENT_END_MARKER];

describe('reference block without a debug line (FR-06, DEC-07, TC-09, TC-10)', () => {
  it('is the same block in full mode, in light mode, and with the debug mode on', () => {
    expect(referenceBlockFor(DEFAULT_CONFIG)).toBe(BLOCK.join('\n'));
    expect(referenceBlockFor(DEBUG_CONFIG)).toBe(BLOCK.join('\n'));
    expect(referenceBlockFor({ ...DEBUG_CONFIG, lightMode: { triggerZone: 'RED' } })).toBe(BLOCK.join('\n'));
  });
  it('joins the lines with CRLF when asked', () => {
    expect(referenceBlockFor(DEBUG_CONFIG, '\r\n')).toBe(BLOCK.join('\r\n'));
  });
  it('never carries the debug instruction, which now lives in the telemetry block', () => {
    expect(referenceBlockFor(DEBUG_CONFIG)).not.toContain('Debug mode');
    expect(referenceBlockFor(DEBUG_CONFIG)).not.toContain('📊');
  });
});
