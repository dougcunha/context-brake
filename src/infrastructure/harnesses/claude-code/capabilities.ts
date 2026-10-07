import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const CLAUDE_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unknown', impact: 'Read from the session transcript, whose format is undocumented; falls back to an estimate. The context window comes from the status line bridge, which init installs by default; without it, the window falls back to contextWindowCeiling.' },
  { id: 'auto_restart', state: 'unknown', impact: 'Opt-in through init --auto-restart; needs Claude Code 2.1.287 or later with mods enabled. Run doctor to check that the mod loads.' },
];
