import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS, HARNESS_IDS, type CapabilityId, type HarnessId, type SupportLevel, type VersionProbe } from '../../src/core/contracts/harness.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

type Expectation = { level: SupportLevel; states: string; limitations: readonly (readonly [CapabilityId, string])[] };

const STATES: Readonly<Record<string, 'supported' | 'unsupported' | 'unknown'>> = { S: 'supported', U: 'unsupported', '?': 'unknown' };

const OTHER_AUTO_RESTART = ['auto_restart', 'Automatic restart in an interactive session exists only for Claude Code; after the restart signal, start the new session yourself.'] as const;

const VERSION: VersionProbe = { status: 'resolved', display: '1.0.0', normalized: '1.0.0', source: 'executable', minimumVersion: '1.0.0' };

const EXPECTED: Readonly<Record<HarnessId, Expectation>> = {
  'claude-code': { level: 'full', states: 'SS??', limitations: [
    ['context_usage', 'Read from the session transcript, whose format is undocumented; falls back to an estimate. The context window comes from the status line bridge, which init installs by default; without it, the window falls back to contextWindowCeiling.'],
    ['auto_restart', 'Opt-in through init --auto-restart; needs Claude Code 2.1.287 or later with mods enabled. Run doctor to check that the mod loads.'],
  ] },
  'codex-cli': { level: 'full', states: 'SSUU', limitations: [
    ['context_usage', 'Context usage is not exposed to Codex CLI hooks.'],
    OTHER_AUTO_RESTART,
  ] },
  cursor: { level: 'full', states: 'SSUU', limitations: [
    ['context_usage', 'Context usage reaches Cursor hooks only before compaction, so ContextBrake estimates it.'],
    OTHER_AUTO_RESTART,
  ] },
  'github-copilot-cli': { level: 'full', states: 'SSUU', limitations: [
    ['context_usage', 'Context usage is not exposed to GitHub Copilot CLI hooks.'],
    OTHER_AUTO_RESTART,
  ] },
  opencode: { level: 'partial', states: 'UUUU', limitations: [
    ['post_tool_telemetry', 'Model visibility of post-tool output modification is unconfirmed in OpenCode.'],
    ['session_boot', 'Stable boot injection is experimental in OpenCode.'],
    ['context_usage', 'No documented API exposes context usage to OpenCode plugins.'],
    OTHER_AUTO_RESTART,
  ] },
  pi: { level: 'full', states: 'SSSU', limitations: [
    OTHER_AUTO_RESTART,
  ] },
  'oh-my-pi': { level: 'full', states: 'SSSU', limitations: [
    OTHER_AUTO_RESTART,
  ] },
  'antigravity-cli': { level: 'partial', states: 'UUUU', limitations: [
    ['post_tool_telemetry', 'Antigravity CLI PostToolUse accepts only empty output; telemetry is indirect via PreInvocation.'],
    ['session_boot', 'Session boot is indirect via PreInvocation.'],
    ['context_usage', 'Context usage is not exposed to Antigravity CLI hooks.'],
    OTHER_AUTO_RESTART,
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
