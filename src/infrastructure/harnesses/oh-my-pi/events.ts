import type { RuntimeDecision, RuntimeEvent, SessionKey, ToolCall } from '../../../core/contracts/runtime.js';
import type { RuntimeInput } from '../../../core/services/brake-engine.js';
import { asRecord, characterLength, parsePayload, textValue } from '../common/runtime-support.js';
import { ompPayloadSchema } from './schemas.js';

const SHELL_TOOLS = ['bash', 'run_command'];
const WRITE_TOOLS = ['write', 'edit'];
const READ_TOOLS = ['read'];

function toolOf(name: string | undefined, input: unknown): ToolCall {
  const tool = name ?? 'unknown';
  const args = asRecord(input);
  if (SHELL_TOOLS.includes(tool)) return { name: tool, category: 'shell', paths: [], command: textValue(args?.['command']) };
  const path = textValue(args?.['path']);
  if (path === null) return { name: tool, category: 'other', paths: [], command: null };
  if (WRITE_TOOLS.includes(tool)) return { name: tool, category: 'file_write', paths: [path], command: null };
  if (READ_TOOLS.includes(tool)) return { name: tool, category: 'file_read', paths: [path], command: null };
  return { name: tool, category: 'other', paths: [], command: null };
}

function assistantText(message: unknown): string {
  const record = asRecord(message);
  if (record?.['role'] !== 'assistant') return '';
  const content = record['content'];
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.flatMap((part) => {
    const entry = asRecord(part);
    return entry?.['type'] === 'text' && typeof entry['text'] === 'string' ? [entry['text']] : [];
  }).join('\n');
}

function resetOf(session: SessionKey, reason: string | undefined): RuntimeEvent | null {
  if (reason === 'new' || reason === 'startup') return { kind: 'session_reset', session, reason: 'new' };
  return null;
}

export function mapOmpEvent(eventName: string, payload: unknown, session: SessionKey): RuntimeEvent | null {
  const data = parsePayload(ompPayloadSchema, payload);
  switch (eventName) {
    case 'tool_call': return { kind: 'pre_tool', session, tool: toolOf(data.toolName, data.input) };
    case 'tool_result': return { kind: 'post_tool', session, tool: toolOf(data.toolName, data.input), toolUseId: data.toolCallId ?? null };
    case 'session_start': return resetOf(session, data.reason);
    case 'session_compact': case 'auto_compaction_end': return { kind: 'session_reset', session, reason: 'compact' };
    case 'session_stop': return { kind: 'response_end', session, text: data.last_assistant_message ?? '' };
    case 'message_end': return asRecord(data.message)?.['role'] === 'assistant' ? { kind: 'response_end', session, text: assistantText(data.message) } : null;
    default: return null;
  }
}

export function mapOmpInput(eventName: string, payload: unknown): RuntimeInput {
  if (eventName !== 'tool_result') return {};
  const data = parsePayload(ompPayloadSchema, payload);
  return { observedCharacters: characterLength(data.input) + characterLength(data.content) };
}

export function renderOmpToolCall(decision: RuntimeDecision): { block: true; reason: string } | undefined {
  return decision.kind === 'deny' ? { block: true, reason: decision.message } : undefined;
}

export function renderOmpToolResult(payload: unknown, block: string): { content: unknown[] } {
  const data = parsePayload(ompPayloadSchema, payload);
  const parts = Array.isArray(data.content) ? [...data.content] : typeof data.content === 'string' ? [{ type: 'text', text: data.content }] : [];
  return { content: [...parts, { type: 'text', text: block }] };
}
