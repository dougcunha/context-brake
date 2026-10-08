import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const PI_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'supported' },
  { id: 'auto_restart', state: 'supported' },
];
