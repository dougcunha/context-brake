import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { planConfigChange } from '../../src/core/services/installation-builder.js';

const WITH_COMMAND = { ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED' as const, command: '/sdd-snapshot', resumeCommand: '/sdd-resume' } };

function summaryOf(input: Parameters<typeof planConfigChange>[0]): string {
  return planConfigChange(input).change.preview.summary;
}

describe('init config summary reports the snapshot settings (prd-12 User experience, codereview_01 CR-02)', () => {
  it('says only zone headers will be injected on a fresh install without a snapshot command', () => {
    expect(summaryOf({ root: '/repo', current: null, active: ['claude-code'] })).toContain('no snapshot command, so only zone headers will be injected (trigger: RED)');
  });
  it('names the snapshot command, trigger zone, and resume command it writes', () => {
    const update = { kind: 'set', section: WITH_COMMAND.snapshot } as const;
    expect(summaryOf({ root: '/repo', current: null, active: [], snapshotUpdate: update })).toContain('snapshot command /sdd-snapshot at RED, resume command /sdd-resume');
  });
  it('keeps reporting the configured command when the run leaves the snapshot section unchanged', () => {
    expect(summaryOf({ root: '/repo', current: WITH_COMMAND, active: ['codex-cli'] })).toContain('snapshot command /sdd-snapshot at RED');
  });
  it('omits the resume part when no resume command is set', () => {
    const update = { kind: 'set', section: { triggerZone: 'YELLOW', command: '/snap' } } as const;
    expect(summaryOf({ root: '/repo', current: null, active: [], snapshotUpdate: update })).toMatch(/snapshot command \/snap at YELLOW(;|$)/);
  });
});
