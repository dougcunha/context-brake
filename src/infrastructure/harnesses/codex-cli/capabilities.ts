import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const CODEX_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unknown', impact: 'Read from the token_count events of the session rollout file, whose format is undocumented; falls back to an estimate. The context window comes from the same event; without it, the window falls back to contextWindowCeiling.' },
  { id: 'auto_restart', state: 'unsupported', impact: 'Semi-automatic restart: run /new; the new session resumes by itself.' },
];
