import type { CapabilityDefinition } from '../../../core/contracts/harness.js';

export const CURSOR_CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'Context usage reaches Cursor hooks only before compaction, so ContextBrake estimates it.' },
  { id: 'auto_restart', state: 'unsupported', impact: 'Semi-automatic restart: start a new session; it resumes by itself.' },
];
