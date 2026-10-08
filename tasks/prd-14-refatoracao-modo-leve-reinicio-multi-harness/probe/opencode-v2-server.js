import { createCapture, endsWithMarker, SEED } from './capture.js';

/* global __PROBE_ROOT__ */
const NOISY = /delta|heartbeat|pty|lsp|file\.watcher/;
const state = { handled: new Set(), restarts: 0, lastText: new Map() };

function keysOf(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object' && typeof value !== 'function') return typeof value;
  const own = Object.keys(value);
  const proto = Object.getPrototypeOf(value);
  const inherited = proto && proto !== Object.prototype ? Object.getOwnPropertyNames(proto).filter((name) => name !== 'constructor') : [];
  return [...own, ...inherited];
}

function findSessionID(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) return undefined;
  if (typeof value.sessionID === 'string') return value.sessionID;
  for (const child of Object.values(value)) {
    const found = findSessionID(child, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function isIdle(event) {
  const props = event?.properties ?? event?.data ?? event;
  const status = props?.status;
  return /idle/.test(event?.type ?? '') || status === 'idle' || status?.type === 'idle';
}

async function attempt(capture, name, call) {
  try {
    const result = await call();
    await capture(`step:${name}`, { keys: keysOf(result), result });
    return result;
  } catch (error) {
    await capture(`step:${name}_error`, { message: String(error?.message ?? error) });
    return undefined;
  }
}

async function lastAssistantText(ctx, sessionID, capture) {
  const result = await attempt(capture, 'session.messages', () => ctx.session.messages({ sessionID }));
  const items = result?.data ?? result?.items ?? result ?? [];
  if (!Array.isArray(items)) return '';
  const last = [...items].reverse().find((item) => (item?.info?.role ?? item?.role) === 'assistant');
  const parts = last?.parts ?? last?.content ?? [];
  return Array.isArray(parts) ? parts.filter((part) => part?.type === 'text').map((part) => part.text).join('\n') : '';
}

async function restart(ctx, capture) {
  state.restarts += 1;
  const created = await attempt(capture, "session.create", () => ctx.session.create({ location: ctx.location }));
  const sessionID = created?.data?.id ?? created?.id ?? created?.sessionID;
  await capture("created_id", { sessionID });
  if (!sessionID) return;
  const shapes = [
    ["prompt{sessionID,prompt:{text}}", () => ctx.session.prompt({ sessionID, prompt: { text: SEED } })],
    ["prompt{sessionID,text}", () => ctx.session.prompt({ sessionID, text: SEED })],
    ["prompt(sessionID,{text})", () => ctx.session.prompt(sessionID, { text: SEED })],
  ];
  for (const [name, call] of shapes) {
    const result = await attempt(capture, name, call);
    if (result !== undefined) return;
  }
}

async function onEvent(ctx, capture, event) {
  if (NOISY.test(event?.type ?? "")) return;
  await capture(`evt:${event?.type}`, event);
  const sessionID = event?.data?.sessionID;
  if (event?.type === "session.text.ended" && sessionID) state.lastText.set(sessionID, event.data.text ?? "");
  if (event?.type !== "session.execution.succeeded" || !sessionID || state.handled.has(sessionID)) return;
  const text = state.lastText.get(sessionID) ?? "";
  await capture("turn_end", { sessionID, text, marker: endsWithMarker(text) });
  if (!endsWithMarker(text)) return;
  state.handled.add(sessionID);
  await restart(ctx, capture);
}

async function subscribe(ctx, capture) {
  const subscription = await attempt(capture, 'event.subscribe', () => ctx.event.subscribe());
  const stream = subscription?.stream ?? subscription?.data ?? subscription;
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') return;
  for await (const event of stream) await onEvent(ctx, capture, event);
}

async function setup(ctx) {
  const capture = createCapture('opencode-v2', __PROBE_ROOT__);
  await capture('loaded', { ctxKeys: keysOf(ctx), location: ctx.location, sessionKeys: keysOf(ctx.session), eventKeys: keysOf(ctx.event), commandKeys: keysOf(ctx.command), cwd: process.cwd() });
  void subscribe(ctx, capture).catch((error) => capture('subscribe_loop_error', { message: String(error?.message ?? error) }));
}

export default { id: 'context-brake.probe', setup };
