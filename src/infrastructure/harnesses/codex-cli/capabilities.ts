import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const CODEX_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'unsupported', impact: 'Hosted tools such as web search bypass Codex CLI hooks.' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to Codex CLI hooks.' },
  { id: 'timeout_fail_closed', state: 'unsupported', impact: 'A hook error, invalid output, or timeout lets the tool call proceed.' },
];
