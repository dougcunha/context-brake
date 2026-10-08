import { createCapture, endsWithMarker, SEED } from './capture.js';

const NOISY = /delta|part\.updated|heartbeat|pty|lsp|file\.watcher/;
const state = { handled: new Set(), restarts: 0 };

function keysOf(value) {
  return value && typeof value === 'object' ? Object.keys(value) : typeof value;
}

function findSessionID(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 4) return undefined;
  if (typeof value.sessionID === 'string') return value.sessionID;
  for (const child of Object.values(value)) {
    const found = findSessionID(child, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function isIdle(event) {
  const status = event?.properties?.status ?? event?.data?.status ?? event?.status;
  return /idle/.test(event?.type ?? '') || status === 'idle' || status?.type === 'idle';
}

async function lastAssistantText(api, sessionID, capture) {
  try {
    const response = await api.client.session.messages({ sessionID });
    const items = response?.data ?? response ?? [];
    const last = [...items].reverse().find((item) => (item?.info?.role ?? item?.role) === 'assistant');
    await capture('messages_shape', { count: items.length, lastKeys: keysOf(last), infoKeys: keysOf(last?.info) });
    return (last?.parts ?? []).filter((part) => part.type === 'text').map((part) => part.text).join('\n');
  } catch (error) {
    await capture('messages_error', { message: String(error?.message ?? error) });
    return '';
  }
}

async function step(capture, name, call) {
  try {
    const result = await call();
    await capture(`step:${name}`, { keys: keysOf(result), data: result?.data ?? result, error: result?.error });
    return result;
  } catch (error) {
    await capture(`step:${name}_error`, { message: String(error?.message ?? error) });
    return undefined;
  }
}

async function restart(api, capture) {
  state.restarts += 1;
  const created = await step(capture, 'session.create', () => api.client.session.create({}));
  const sessionID = created?.data?.id ?? created?.id;
  if (!sessionID) return;
  await step(capture, 'router.navigate', async () => api.ui.router.navigate({ type: 'session', sessionID }));
  await step(capture, 'session.promptAsync', () => api.client.session.promptAsync({ sessionID, parts: [{ type: 'text', text: SEED }] }));
}

function setup(api) {
  const capture = createCapture('opencode-v2', process.cwd());
  void capture('loaded', {
    apiKeys: keysOf(api), clientKeys: keysOf(api.client), sessionKeys: keysOf(api.client?.session), eventKeys: keysOf(api.event),
    uiKeys: keysOf(api.ui), routerKeys: keysOf(api.ui?.router), dataKeys: keysOf(api.data), route: api.ui?.router?.current?.(), hasTTY: Boolean(process.stdout.isTTY),
  });
  const stop = api.event.listen(async (event) => {
    if (NOISY.test(event?.type ?? '')) return;
    await capture(`evt:${event?.type}`, event);
    if (!isIdle(event)) return;
    const sessionID = findSessionID(event);
    if (!sessionID || state.handled.has(sessionID)) return;
    const text = await lastAssistantText(api, sessionID, capture);
    await capture('idle_text', { sessionID, text, marker: endsWithMarker(text) });
    if (!endsWithMarker(text)) return;
    state.handled.add(sessionID);
    await restart(api, capture);
  });
  return () => stop?.();
}

export default { id: 'context-brake.probe.tui', setup };
