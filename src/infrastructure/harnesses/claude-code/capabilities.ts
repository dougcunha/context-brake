import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const CLAUDE_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage reaches the Claude Code status line, not hooks, so ContextBrake estimates it.' },
  { id: 'timeout_fail_closed', state: 'unsupported', impact: 'A hook timeout, or a hook failure without an explicit deny, lets the tool call proceed.' },
];
