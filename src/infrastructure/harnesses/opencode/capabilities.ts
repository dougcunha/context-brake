import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const OPENCODE_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'unknown', impact: 'Whether tool.execute.before runs for every OpenCode tool is not documented.' },
  { id: 'post_tool_telemetry', state: 'unsupported', impact: 'Model visibility of post-tool output modification is unconfirmed in OpenCode.' },
  { id: 'session_boot', state: 'unsupported', impact: 'Stable boot injection is experimental in OpenCode.' },
  { id: 'context_usage', state: 'unsupported', impact: 'No documented API exposes context usage to OpenCode plugins.' },
  { id: 'timeout_fail_closed', state: 'unknown', impact: 'Failure and timeout behavior of OpenCode plugins is not documented.' },
];
