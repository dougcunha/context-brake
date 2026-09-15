import type { CapabilityDefinition } from '../../../src/core/contracts/harness.js';
import type { RuntimeDescriptor, RuntimeEvent, SessionKey, ToolCall } from '../../../src/core/contracts/runtime.js';
import type { RuntimeInput } from '../../../src/core/services/brake-engine.js';
import { runProcessHook, type ProcessHarnessAdapter } from '../../../src/infrastructure/runtime/process-hook-host.js';

const CAPABILITIES: readonly CapabilityDefinition[] = [
  { id: 'pre_tool_block', state: 'supported' },
  { id: 'tool_coverage', state: 'supported' },
  { id: 'post_tool_telemetry', state: 'supported' },
  { id: 'session_boot', state: 'supported' },
  { id: 'context_usage', state: 'unsupported', impact: 'The fixture host estimates usage.' },
  { id: 'timeout_fail_closed', state: 'unsupported', impact: 'The fixture host is not a real integration.' },
];
const DESCRIPTOR: RuntimeDescriptor = { harness: 'claude-code', capabilities: CAPABILITIES, estimation: { baselineTokens: 15000, tokensPerTurn: 150 }, newSessionCommand: '/clear' };

function field(payload: unknown, key: string): unknown {
  return typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>)[key] : undefined;
}
function text(payload: unknown, key: string): string | null {
  const value = field(payload, key);
  return typeof value === 'string' ? value : null;
}
function session(payload: unknown): SessionKey {
  return { harness: 'claude-code', sessionId: text(payload, 'session_id') ?? 'fixture-session', agentId: null };
}
function tool(payload: unknown): ToolCall {
  const name = text(payload, 'tool_name') ?? 'unknown';
  const input = field(payload, 'tool_input');
  const command = typeof input === 'object' && input !== null ? text(input, 'command') : null;
  const path = typeof input === 'object' && input !== null ? text(input, 'file_path') : null;
  if (name === 'Bash' && command !== null) return { name, category: 'shell', paths: [], command };
  if (path !== null) return { name, category: name === 'Read' ? 'file_read' : 'file_write', paths: [path], command: null };
  return { name, category: 'other', paths: [], command: null };
}
function mapEvent(eventName: string, payload: unknown): RuntimeEvent | null {
  if (eventName === 'PreToolUse') return { kind: 'pre_tool', session: session(payload), tool: tool(payload) };
  if (eventName === 'PostToolUse') return { kind: 'post_tool', session: session(payload), tool: tool(payload), toolUseId: text(payload, 'tool_use_id') };
  if (eventName === 'SessionStart') return { kind: 'session_reset', session: session(payload), reason: 'new' };
  if (eventName === 'Compact') return { kind: 'session_reset', session: session(payload), reason: 'compact' };
  if (eventName === 'Stop') return { kind: 'response_end', session: session(payload), text: text(payload, 'last_assistant_message') ?? '' };
  return null;
}
function mapInput(_eventName: string, payload: unknown): RuntimeInput {
  return { observedCharacters: JSON.stringify(field(payload, 'tool_input') ?? null).length + JSON.stringify(field(payload, 'tool_response') ?? null).length };
}
const adapter: ProcessHarnessAdapter = {
  descriptor: DESCRIPTOR,
  mapEvent,
  mapInput,
  renderDecision: (decision) => JSON.stringify(decision),
  resolveProjectRoot: async () => process.env['CB_TEST_ROOT'] ?? process.cwd(),
};
process.exit(await runProcessHook(adapter));
