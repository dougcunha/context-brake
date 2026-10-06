import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const COPILOT_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to GitHub Copilot CLI hooks.' },
  { id: 'timeout_fail_closed', state: 'unsupported', impact: 'A hook timeout lets the tool call proceed; a command failure without a timeout denies it.' },
  { id: 'auto_restart', state: 'unsupported', impact: 'Automatic restart in an interactive session exists only for Claude Code; after the restart signal, start the new session yourself.' },
];
