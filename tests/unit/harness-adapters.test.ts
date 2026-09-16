import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS, HARNESS_IDS, type CapabilityId, type HarnessId, type SupportLevel, type VersionProbe } from '../../src/core/contracts/harness.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

type Expectation = { level: SupportLevel; states: string; limitations: readonly (readonly [CapabilityId, string])[] };

const STATES: Readonly<Record<string, 'supported' | 'unsupported' | 'unknown'>> = { S: 'supported', U: 'unsupported', '?': 'unknown' };

const VERSION: VersionProbe = { status: 'resolved', display: '1.0.0', normalized: '1.0.0', source: 'executable', minimumVersion: '1.0.0' };

const EXPECTED: Readonly<Record<HarnessId, Expectation>> = {
  'claude-code': { level: 'full', states: 'SSSSUU', limitations: [
    ['context_usage', 'Context usage reaches the Claude Code status line, not hooks, so ContextBrake estimates it.'],
    ['timeout_fail_closed', 'A hook timeout, or a hook failure without an explicit deny, lets the tool call proceed.'],
  ] },
  'codex-cli': { level: 'partial', states: 'SUSSUU', limitations: [
    ['tool_coverage', 'Hosted tools such as web search bypass Codex CLI hooks.'],
    ['context_usage', 'Context usage is not exposed to Codex CLI hooks.'],
    ['timeout_fail_closed', 'A hook error, invalid output, or timeout lets the tool call proceed.'],
  ] },
  cursor: { level: 'full', states: 'SSSSUS', limitations: [
    ['context_usage', 'Context usage reaches Cursor hooks only before compaction, so ContextBrake estimates it.'],
  ] },
  'github-copilot-cli': { level: 'full', states: 'SSSSUU', limitations: [
    ['context_usage', 'Context usage is not exposed to GitHub Copilot CLI hooks.'],
    ['timeout_fail_closed', 'A hook timeout lets the tool call proceed; a command failure without a timeout denies it.'],
  ] },
  opencode: { level: 'partial', states: 'S?UUU?', limitations: [
    ['tool_coverage', 'Whether tool.execute.before runs for every OpenCode tool is not documented.'],
    ['post_tool_telemetry', 'Model visibility of post-tool output modification is unconfirmed in OpenCode.'],
    ['session_boot', 'Stable boot injection is experimental in OpenCode.'],
    ['context_usage', 'No documented API exposes context usage to OpenCode plugins.'],
    ['timeout_fail_closed', 'Failure and timeout behavior of OpenCode plugins is not documented.'],
  ] },
  pi: { level: 'full', states: 'SSSSS?', limitations: [
    ['timeout_fail_closed', 'Timeout behavior of Pi extension handlers is not documented, and a throwing handler is logged without blocking.'],
  ] },
  'oh-my-pi': { level: 'full', states: 'SSSSS?', limitations: [
    ['timeout_fail_closed', 'Timeout behavior of Oh-My-Pi extension handlers is not documented.'],
  ] },
  'antigravity-cli': { level: 'partial', states: 'S?UUU?', limitations: [
    ['tool_coverage', 'Hook coverage in the Antigravity CLI is not confirmed by its documentation.'],
    ['post_tool_telemetry', 'Antigravity CLI PostToolUse accepts only empty output; telemetry is indirect via PreInvocation.'],
    ['session_boot', 'Session boot is indirect via PreInvocation.'],
    ['context_usage', 'Context usage is not exposed to Antigravity CLI hooks.'],
    ['timeout_fail_closed', 'Failure and timeout behavior of Antigravity hooks is not documented.'],
  ] },
};

describe('TC-02: exact capability profile for every adapter (FR-02, FR-04, CA-15)', () => {
  for (const id of HARNESS_IDS) {
    it(`matches the approved table for ${id}`, () => {
      const expected = EXPECTED[id];
      const profile = getAdapter(id).capabilityProfile(VERSION);
      const states = CAPABILITY_IDS.map((capability) => profile.capabilities.find((status) => status.id === capability)?.state);
      expect(profile.supportLevel).toBe(expected.level);
      expect(states).toEqual([...expected.states].map((code) => STATES[code]));
      expect(profile.limitations).toEqual(expected.limitations.map(([capability, impact]) => ({ capability, impact })));
    });
  }
});
