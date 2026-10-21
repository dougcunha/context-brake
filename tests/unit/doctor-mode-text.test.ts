import { describe, expect, it } from 'vitest';
import { contextRows, describeSnapshot } from '../../src/cli/output/doctor-mode-text.js';
import type { SnapshotReport } from '../../src/core/contracts/diagnostics.js';

const NO_COMMAND: SnapshotReport = { triggerZone: 'RED', command: null, resumeCommand: null };
const WITH_COMMAND: SnapshotReport = { triggerZone: 'YELLOW', command: 'sdd-snapshot', resumeCommand: 'resume' };
const WITH_FORMS: SnapshotReport = { ...WITH_COMMAND, invocations: [{ harness: 'claude-code', command: '/sdd-snapshot', resumeCommand: '/resume' }, { harness: 'opencode', command: 'use the sdd-snapshot skill', resumeCommand: null }] };

describe('doctor context rows (FR-07, NFR-03, TC-05)', () => {
  it('prints nothing without context, snapshot, or debug mode', () => {
    expect(contextRows({})).toEqual([]);
  });
  it('says when no snapshot command is configured', () => {
    expect(describeSnapshot(NO_COMMAND)).toBe('not configured (zone headers only, trigger RED)');
  });
  it('lists the window, the snapshot with each harness invocation, and the debug mode in this order', () => {
    const rows = contextRows({ contextWindow: { bridge: 'installed', mod: 'reporting', source: 'mod', lastWindowTokens: 1000000 }, snapshot: WITH_FORMS, debugMode: true });
    expect(rows).toEqual([
      { label: 'window', value: 'mod (mod reporting, bridge installed, last window 1,000,000)' },
      { label: 'snapshot', value: 'sdd-snapshot at YELLOW, resume resume', notes: ['claude-code: /sdd-snapshot, resume /resume', 'opencode: use the sdd-snapshot skill'] },
      { label: 'debug mode', value: 'on', tone: 'warn' },
    ]);
  });
  it('prints an unknown last window', () => {
    const [row] = contextRows({ contextWindow: { bridge: 'installed', mod: 'absent', source: 'statusline', lastWindowTokens: null } });
    expect(row?.value).toBe('statusline (mod absent, bridge installed, last window unknown)');
  });
});
