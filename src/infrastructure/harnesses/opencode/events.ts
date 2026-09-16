import type { RuntimeEvent, SessionKey, ToolCall } from '../../../core/contracts/runtime.js';
import { asRecord, characterLength, parsePayload, textValue } from '../common/runtime-support.js';
import { opencodeEventPayloadSchema, opencodeToolAfterOutputSchema, opencodeToolBeforeOutputSchema, opencodeToolExecuteInputSchema } from './schemas.js';

const SHELL_TOOLS = ['bash'];
const WRITE_TOOLS = ['write', 'edit'];
const READ_TOOLS = ['read'];

function toolOf(name: string | undefined, args: unknown): ToolCall {
  const tool = name ?? 'unknown';
  const record = asRecord(args);
  if (SHELL_TOOLS.includes(tool)) return { name: tool, category: 'shell', paths: [], command: textValue(record?.['command']) };
  const path = textValue(record?.['filePath']);
  if (path === null) return { name: tool, category: 'other', paths: [], command: null };
  if (WRITE_TOOLS.includes(tool)) return { name: tool, category: 'file_write', paths: [path], command: null };
  if (READ_TOOLS.includes(tool)) return { name: tool, category: 'file_read', paths: [path], command: null };
  return { name: tool, category: 'other', paths: [], command: null };
}

export function mapOpenCodeToolCall(input: unknown, output: unknown, session: SessionKey): RuntimeEvent {
  const data = parsePayload(opencodeToolExecuteInputSchema, input);
  const args = parsePayload(opencodeToolBeforeOutputSchema, output ?? {}).args;
  return { kind: 'pre_tool', session, tool: toolOf(data.tool, args) };
}

export function mapOpenCodeToolResult(input: unknown, output: unknown, session: SessionKey): RuntimeEvent {
  const data = parsePayload(opencodeToolExecuteInputSchema, input);
  const args = parsePayload(opencodeToolAfterOutputSchema, output ?? {}).args;
  return { kind: 'post_tool', session, tool: toolOf(data.tool, args), toolUseId: data.callID ?? null };
}

export function openCodeObservedCharacters(output: unknown): number {
  return characterLength(parsePayload(opencodeToolAfterOutputSchema, output ?? {}).args);
}

export type OpenCodeSessionEvent = { readonly type: 'session.created' | 'session.compacted'; readonly sessionId: string | null };

export function mapOpenCodeSessionEvent(payload: unknown): OpenCodeSessionEvent | null {
  const data = parsePayload(opencodeEventPayloadSchema, payload);
  const type = data.event?.type;
  if (type !== 'session.created' && type !== 'session.compacted') return null;
  const properties = data.event?.properties;
  const sessionId = textValue(properties?.sessionID) ?? textValue(properties?.sessionId) ?? textValue(properties?.info?.id) ?? textValue(properties?.id);
  return { type, sessionId };
}
