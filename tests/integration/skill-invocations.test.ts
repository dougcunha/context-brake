import { describe, expect, it } from 'vitest';
import { HARNESS_IDS, type HarnessId } from '../../src/core/contracts/harness.js';
import type { RuntimeDescriptor } from '../../src/core/contracts/runtime.js';
import { antigravityDescriptor } from '../../src/infrastructure/harnesses/antigravity-cli/runtime.js';
import { claudeDescriptor } from '../../src/infrastructure/harnesses/claude-code/runtime.js';
import { codexDescriptor } from '../../src/infrastructure/harnesses/codex-cli/runtime.js';
import { cursorDescriptor } from '../../src/infrastructure/harnesses/cursor/runtime.js';
import { copilotDescriptor } from '../../src/infrastructure/harnesses/github-copilot-cli/runtime.js';
import { ompDescriptor } from '../../src/infrastructure/harnesses/oh-my-pi/runtime.js';
import { openCodeDescriptor } from '../../src/infrastructure/harnesses/opencode/runtime.js';
import { piDescriptor } from '../../src/infrastructure/harnesses/pi/runtime.js';
import { resolveSkillInvocation, SKILL_INVOCATIONS } from '../../src/infrastructure/harnesses/skill-invocations.js';

const EXPECTED: Readonly<Record<HarnessId, string>> = {
  'claude-code': '/sdd-snapshot',
  'codex-cli': '$sdd-snapshot',
  cursor: '/sdd-snapshot',
  'github-copilot-cli': '/sdd-snapshot',
  opencode: 'use the sdd-snapshot skill',
  pi: '/skill:sdd-snapshot',
  'oh-my-pi': 'use the sdd-snapshot skill',
  'antigravity-cli': 'use the sdd-snapshot skill',
};
const DESCRIPTORS: readonly RuntimeDescriptor[] = [claudeDescriptor, codexDescriptor, cursorDescriptor, copilotDescriptor, openCodeDescriptor, piDescriptor, ompDescriptor, antigravityDescriptor];

describe('skill invocation of each harness (prd-19 FR-03, NFR-01, TC-03)', () => {
  it.each(HARNESS_IDS)('renders the documented form for %s', (harness) => {
    expect(resolveSkillInvocation(harness)('sdd-snapshot')).toBe(EXPECTED[harness]);
  });
  it('declares a form for every harness id', () => {
    expect(Object.keys(SKILL_INVOCATIONS).sort()).toEqual([...HARNESS_IDS].sort());
  });
  it.each(DESCRIPTORS.map((descriptor) => [descriptor.harness, descriptor] as const))('gives the %s runtime the same form as the CLI resolver', (harness, descriptor) => {
    expect(descriptor.skillInvocation).toBe(resolveSkillInvocation(harness));
  });
});
