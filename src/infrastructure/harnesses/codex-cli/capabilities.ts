import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const CODEX_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage is not exposed to Codex CLI hooks.' },
  { id: 'auto_restart', state: 'unsupported', impact: 'Semi-automatic restart: run /new; the new session resumes by itself.' },
];
