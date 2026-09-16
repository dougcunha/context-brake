import { describe, expect, it } from 'vitest';
import type { HarnessAdapter } from '../../src/core/contracts/adapter.js';
import type { CapabilityDefinition, CapabilityId, CapabilityState } from '../../src/core/contracts/harness.js';
import { deriveBrakeMode } from '../../src/core/services/brake-mode.js';
import { AntigravityAdapter } from '../../src/infrastructure/harnesses/antigravity-cli/adapter.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { CodexAdapter } from '../../src/infrastructure/harnesses/codex-cli/adapter.js';
import { CursorAdapter } from '../../src/infrastructure/harnesses/cursor/adapter.js';
import { CopilotAdapter } from '../../src/infrastructure/harnesses/github-copilot-cli/adapter.js';
import { OhMyPiAdapter } from '../../src/infrastructure/harnesses/oh-my-pi/adapter.js';
import { OpenCodeAdapter } from '../../src/infrastructure/harnesses/opencode/adapter.js';
import { PiAdapter } from '../../src/infrastructure/harnesses/pi/adapter.js';

function definitionsFrom(adapter: HarnessAdapter): readonly CapabilityDefinition[] {
  const profile = adapter.capabilityProfile();
  return profile.capabilities.map((status) => {
    const impact = profile.limitations.find((limitation) => limitation.capability === status.id)?.impact;
    return impact === undefined ? { id: status.id, state: status.state } : { id: status.id, state: status.state, impact };
  });
}
function definition(id: CapabilityId, state: CapabilityState, impact?: string): CapabilityDefinition {
  return impact === undefined ? { id, state } : { id, state, impact };
}
function reasonFrom(adapter: HarnessAdapter): string {
  const reason = deriveBrakeMode(definitionsFrom(adapter)).reason ?? '';
  expect(reason).not.toBe('');
  return reason;
}

describe('brake mode from capabilities (RF21, CA-17, DEC-10, TC-25)', () => {
  it.each([new ClaudeAdapter(), new CursorAdapter(), new CopilotAdapter(), new PiAdapter(), new OhMyPiAdapter()])('derives enforced for $id', (adapter) => {
    expect(deriveBrakeMode(definitionsFrom(adapter))).toEqual({ mode: 'enforced', reason: null });
  });
  it('derives cooperative for Codex CLI with the hosted-tools reason', () => {
    expect(deriveBrakeMode(definitionsFrom(new CodexAdapter())).mode).toBe('cooperative');
    expect(reasonFrom(new CodexAdapter())).toContain('Hosted tools');
  });
  it('derives cooperative for OpenCode with the coverage reason', () => {
    expect(deriveBrakeMode(definitionsFrom(new OpenCodeAdapter())).mode).toBe('cooperative');
    expect(reasonFrom(new OpenCodeAdapter())).toContain('tool.execute.before');
  });
  it('derives cooperative for Antigravity CLI with the coverage reason (DEC-14)', () => {
    expect(deriveBrakeMode(definitionsFrom(new AntigravityAdapter())).mode).toBe('cooperative');
    expect(reasonFrom(new AntigravityAdapter())).toContain('Hook coverage in the Antigravity CLI');
  });
});

describe('brake mode never enforced without guaranteed blocking (RF21, TC-25)', () => {
  it('stays cooperative for an unknown block or coverage state', () => {
    expect(deriveBrakeMode([definition('pre_tool_block', 'unknown', 'block unknown'), definition('tool_coverage', 'supported')])).toEqual({ mode: 'cooperative', reason: 'block unknown' });
    expect(deriveBrakeMode([definition('pre_tool_block', 'supported'), definition('tool_coverage', 'unknown', 'coverage unknown')])).toEqual({ mode: 'cooperative', reason: 'coverage unknown' });
    expect(deriveBrakeMode([definition('pre_tool_block', 'unsupported', 'no block'), definition('tool_coverage', 'supported')]).mode).toBe('cooperative');
  });
  it('stays cooperative when a required capability definition is missing', () => {
    const result = deriveBrakeMode([definition('pre_tool_block', 'supported')]);
    expect(result.mode).toBe('cooperative');
    expect(result.reason).toContain('tool_coverage');
  });
});
