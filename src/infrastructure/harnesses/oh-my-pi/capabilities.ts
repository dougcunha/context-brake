import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const OMP_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'supported' },
  { id: 'timeout_fail_closed', state: 'unknown', impact: 'Timeout behavior of Oh-My-Pi extension handlers is not documented.' },
];
