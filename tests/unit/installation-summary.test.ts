import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { planConfigChange, type ConfigChangeInput } from '../../src/core/services/installation-builder.js';

const CONFIG_SUMMARY = 'Configure ContextBrake active harnesses and zones';
const WITH_COMMAND = { ...DEFAULT_CONFIG, snapshot: { triggerZone: 'RED' as const, command: '/sdd-snapshot', resumeCommand: '/sdd-resume' } };
type SummaryCase = { name: string; input: ConfigChangeInput; part: string };
const SUMMARY_CASES: SummaryCase[] = [
  { name: 'says only zone headers will be injected on a fresh install without a snapshot command', input: { root: '/repo', current: null, active: ['claude-code'] }, part: 'no snapshot command, so only zone headers will be injected (trigger: RED)' },
  { name: 'names the snapshot command, trigger zone, and resume command it writes', input: { root: '/repo', current: null, active: [], snapshotUpdate: { kind: 'set', section: WITH_COMMAND.snapshot } }, part: 'snapshot command /sdd-snapshot at RED, resume command /sdd-resume' },
  { name: 'keeps reporting the configured command when the run leaves the snapshot section unchanged', input: { root: '/repo', current: WITH_COMMAND, active: ['codex-cli'] }, part: 'snapshot command /sdd-snapshot at RED, resume command /sdd-resume' },
  { name: 'omits the resume part when no resume command is set', input: { root: '/repo', current: null, active: [], snapshotUpdate: { kind: 'set', section: { triggerZone: 'YELLOW', command: '/snap' } } }, part: 'snapshot command /snap at YELLOW' },
];

describe('init config summary reports the snapshot settings (prd-12 User experience, codereview_01 CR-02)', () => {
  it.each(SUMMARY_CASES)('$name', ({ input, part }) => {
    expect(planConfigChange(input).change.preview.summary).toBe(`${CONFIG_SUMMARY}; ${part}`);
  });
});
