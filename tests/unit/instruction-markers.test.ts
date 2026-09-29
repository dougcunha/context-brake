import { getEncoding } from 'js-tiktoken';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { CURRENT_END_MARKER, CURRENT_START_MARKER, DEBUG_MODE_LINE, referenceBlockFor } from '../../src/core/services/instruction-markers.js';

const TOKEN_BUDGET = 60;
const REFERENCE_LINE = 'When `task_plan.json` exists or tool results include a ContextBrake telemetry block, follow `docs/context-brake-protocol.md`.';
const EXPECTED_DEBUG_LINE = 'Debug mode: end each reply that received a ContextBrake telemetry block with the line `📊 ContextBrake: <usage>% · <used>/<window> (<window origin>) · <source> · <ZONE>`, copied from the latest block.';
const DEBUG_CONFIG = { ...DEFAULT_CONFIG, debug: true };

describe('reference block with the debug mode (TC-03, FR-02, NFR-01, DEC-03)', () => {
  it('keeps the current block when the debug mode is off', () => {
    expect(referenceBlockFor(DEFAULT_CONFIG)).toBe([CURRENT_START_MARKER, REFERENCE_LINE, CURRENT_END_MARKER].join('\n'));
  });
  it('adds the exact debug line after the reference line when the debug mode is on', () => {
    expect(referenceBlockFor(DEBUG_CONFIG)).toBe([CURRENT_START_MARKER, REFERENCE_LINE, EXPECTED_DEBUG_LINE, CURRENT_END_MARKER].join('\n'));
  });
  it('joins the lines with CRLF when asked', () => {
    expect(referenceBlockFor(DEBUG_CONFIG, '\r\n')).toBe([CURRENT_START_MARKER, REFERENCE_LINE, EXPECTED_DEBUG_LINE, CURRENT_END_MARKER].join('\r\n'));
  });
  it('leaves the debug line out in light mode', () => {
    expect(referenceBlockFor({ ...DEBUG_CONFIG, lightMode: { triggerZone: 'RED' } })).not.toContain(DEBUG_MODE_LINE);
  });
  it('keeps the debug line within the token budget', () => {
    expect(getEncoding('o200k_base').encode(DEBUG_MODE_LINE).length).toBeLessThanOrEqual(TOKEN_BUDGET);
  });
});
