import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const ANTIGRAVITY_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'post_tool_telemetry', state: 'unsupported', impact: 'Antigravity CLI PostToolUse accepts only empty output; telemetry is indirect via PreInvocation.' },
  { id: 'session_boot', state: 'unsupported', impact: 'Session boot is indirect via PreInvocation.' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to Antigravity CLI hooks.' },
  { id: 'auto_restart', state: 'unsupported', impact: 'Automatic restart in an interactive session exists only for Claude Code; after the restart signal, start the new session yourself.' },
];
