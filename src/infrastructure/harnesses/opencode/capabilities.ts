import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const OPENCODE_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'post_tool_telemetry', state: 'unsupported', impact: 'Model visibility of post-tool output modification is unconfirmed in OpenCode.' },
  { id: 'session_boot', state: 'unsupported', impact: 'Stable boot injection is experimental in OpenCode.' },
  { id: 'context_usage', state: 'unsupported', impact: 'No documented API exposes context usage to OpenCode plugins.' },
  { id: 'auto_restart', state: 'unsupported', impact: 'No restart: this harness cannot inject the resume instruction.' },
];
