import type { SessionKey } from '../../src/core/contracts/runtime.js';
import type { ToolLine } from '../../src/core/contracts/session-ledger.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { fixedClock } from './runtime-seed.js';

export type ExtensionHandler = (payload: unknown, context: unknown) => Promise<unknown>;
export type ExtensionHandlers = Map<string, ExtensionHandler>;
export type ToolResultCall = { readonly handlers: ExtensionHandlers; readonly context: unknown; readonly callId: string };

type ExtensionApi = { on: (event: string, handler: ExtensionHandler) => void };

export function registerExtension(factory: (api: never) => void): ExtensionHandlers {
  const handlers: ExtensionHandlers = new Map();
  const api: ExtensionApi = { on: (event, handler) => { handlers.set(event, handler); } };
  factory(api as never);
  return handlers;
}

export function extensionContext(root: string, sessionId: string, usage: unknown): unknown {
  return { cwd: root, sessionManager: { getSessionId: () => sessionId }, getContextUsage: () => usage, ui: { notify: () => {} } };
}

export async function toolResultBlock(call: ToolResultCall): Promise<string> {
  const payload = { toolName: 'bash', toolCallId: call.callId, input: { command: 'ls' }, content: [{ type: 'text', text: 'done' }] };
  const rendered = await call.handlers.get('tool_result')!(payload, call.context) as { content: { text?: string }[] } | undefined;
  return rendered?.content.at(-1)?.text ?? '';
}

export async function lastToolLine(root: string, key: SessionKey): Promise<ToolLine | undefined> {
  const lines = await new NodeSessionLedger(root, fixedClock).readLines(key);
  return lines.filter((line): line is ToolLine => line.type === 'tool').at(-1);
}
