import { describe, expect, it } from 'vitest';
import { renderModeLines } from '../../src/cli/output/doctor-mode-text.js';
import type { SnapshotReport } from '../../src/core/contracts/diagnostics.js';

const DEBUG_LINE = '  - debug mode: on\n';
const NO_COMMAND: SnapshotReport = { triggerZone: 'RED', command: null, resumeCommand: null };
const WITH_COMMAND: SnapshotReport = { triggerZone: 'YELLOW', command: '/sdd-snapshot', resumeCommand: '/resume' };

describe('doctor snapshot and debug lines (prd-12 FR-09, TC-13)', () => {
  it('prints nothing without a snapshot report or the debug mode', () => {
    expect(renderModeLines({})).toBe('');
  });
  it('says when no snapshot command is configured', () => {
    expect(renderModeLines({ snapshot: NO_COMMAND })).toBe('  - snapshot: not configured (zone headers only, trigger: RED)\n');
  });
  it('prints the snapshot command, trigger, and resume command before the debug line', () => {
    expect(renderModeLines({ snapshot: WITH_COMMAND, debugMode: true })).toBe(`  - snapshot: /sdd-snapshot at YELLOW, resume: /resume\n${DEBUG_LINE}`);
  });
});
