import { describe, expect, it } from 'vitest';
import { DEFAULT_SNAPSHOT } from '../../src/core/contracts/configuration.js';
import { restartMode } from '../../src/core/services/restart-mode.js';

const AUTO_RESTART = { maxConsecutiveRestarts: 2 };

describe('restart mode (prd-14 FR-01, NFR-05, DEC-01)', () => {
  it('is off without automatic restart, with or without a snapshot command', () => {
    expect(restartMode({ snapshot: DEFAULT_SNAPSHOT })).toBe('off');
    expect(restartMode({ snapshot: { ...DEFAULT_SNAPSHOT, command: '/sdd-snapshot' } })).toBe('off');
  });
  it('uses the snapshot skill when automatic restart and a snapshot command are set', () => {
    expect(restartMode({ autoRestart: AUTO_RESTART, snapshot: { ...DEFAULT_SNAPSHOT, command: '/sdd-snapshot' } })).toBe('snapshot');
  });
  it('uses the markdown handoff when automatic restart is on without a snapshot command', () => {
    expect(restartMode({ autoRestart: AUTO_RESTART, snapshot: DEFAULT_SNAPSHOT })).toBe('handoff');
  });
});
