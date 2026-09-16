import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const ANTIGRAVITY_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'unknown', impact: 'Hook coverage in the Antigravity CLI is not confirmed by its documentation.' },
  { id: 'post_tool_telemetry', state: 'unsupported', impact: 'Antigravity CLI PostToolUse accepts only empty output; telemetry is indirect via PreInvocation.' },
  { id: 'session_boot', state: 'unsupported', impact: 'Session boot is indirect via PreInvocation.' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to Antigravity CLI hooks.' },
  { id: 'timeout_fail_closed', state: 'unknown', impact: 'Failure and timeout behavior of Antigravity hooks is not documented.' },
];
