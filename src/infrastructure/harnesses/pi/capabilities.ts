import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const PI_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'supported' },
  { id: 'timeout_fail_closed', state: 'unknown', impact: 'Timeout behavior of Pi extension handlers is not documented, and a throwing handler is logged without blocking.' },
];
