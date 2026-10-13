import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ContextBrakeConfig } from '../../src/core/contracts/configuration.js';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import type { SkillInvocationFormat } from '../../src/core/contracts/skill-invocation.js';
import { doctorReportExtras } from '../../src/core/services/doctor-report-extras.js';
import { dollarInvocation, slashInvocation } from '../../src/core/services/skill-invocation.js';

function resolver(harness: HarnessId): SkillInvocationFormat {
  return harness === 'codex-cli' ? dollarInvocation : slashInvocation;
}
const BASE = { planPresent: false, contextWindow: undefined, sessions: [] };

function configured(snapshot: ContextBrakeConfig['snapshot']): ContextBrakeConfig {
  return { ...DEFAULT_CONFIG, activeHarnesses: ['claude-code', 'codex-cli'], snapshot };
}

describe('doctor snapshot report forms (prd-19 FR-07, TC-08)', () => {
  it('lists the name and the form of each active harness', () => {
    const { snapshot } = doctorReportExtras({ ...BASE, config: configured({ triggerZone: 'RED', command: 'sdd-snapshot', resumeCommand: 'sdd-orchestrate-flow' }), invocations: resolver }, []);
    expect(snapshot).toEqual({
      triggerZone: 'RED', command: 'sdd-snapshot', resumeCommand: 'sdd-orchestrate-flow',
      invocations: [
        { harness: 'claude-code', command: '/sdd-snapshot', resumeCommand: '/sdd-orchestrate-flow' },
        { harness: 'codex-cli', command: '$sdd-snapshot', resumeCommand: '$sdd-orchestrate-flow' },
      ],
    });
  });
  it('leaves the resume form null without a resume command', () => {
    const { snapshot } = doctorReportExtras({ ...BASE, config: configured({ triggerZone: 'RED', command: 'sdd-snapshot' }), invocations: resolver }, []);
    expect(snapshot?.invocations?.map((entry) => entry.resumeCommand)).toEqual([null, null]);
  });
  it.each([
    ['no snapshot command', configured({ triggerZone: 'RED' }), resolver],
    ['no resolver', configured({ triggerZone: 'RED', command: 'sdd-snapshot' }), undefined],
  ])('adds no forms with %s', (_name, config, invocations) => {
    expect(doctorReportExtras({ ...BASE, config, invocations }, []).snapshot).not.toHaveProperty('invocations');
  });
});
