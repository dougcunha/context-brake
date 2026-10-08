import { createCapture, endsWithMarker, SEED, textOf } from './capture.js';

const state = { restarts: 0, handled: new Set() };

export const ContextBrakeProbe = async ({ client, directory }) => {
  const capture = createCapture('opencode', directory ?? process.cwd());
  await capture('loaded', { directory, clientKeys: Object.keys(client ?? {}), sessionKeys: Object.keys(client?.session ?? {}), tuiKeys: Object.keys(client?.tui ?? {}), hasTTY: Boolean(process.stdout.isTTY) });
  return {
    event: async ({ event }) => {
      await capture(`event:${event.type}`, event.properties);
      if (event.type !== 'session.idle') return;
      const sessionID = event.properties?.sessionID;
      const text = await lastAssistantText(client, sessionID, capture);
      await capture('idle_text', { sessionID, text, marker: endsWithMarker(text) });
      if (!endsWithMarker(text) || state.handled.has(sessionID)) return;
      state.handled.add(sessionID);
      await restart(client, capture);
    },
    'chat.message': async (input, output) => capture('chat.message', { input, role: output?.message?.role }),
  };
};

async function lastAssistantText(client, sessionID, capture) {
  try {
    const response = await client.session.messages({ sessionID });
    const items = response?.data ?? [];
    const last = [...items].reverse().find((item) => item?.info?.role === 'assistant');
    return (last?.parts ?? []).filter((part) => part.type === 'text').map((part) => part.text).join('\n') || textOf(last?.info);
  } catch (error) {
    await capture('messages_error', { message: String(error?.message ?? error) });
    return '';
  }
}

async function restart(client, capture) {
  state.restarts += 1;
  for (const [name, call] of [
    ['executeCommand', () => client.tui.executeCommand({ command: 'session_new' })],
    ['appendPrompt', () => client.tui.appendPrompt({ text: SEED })],
    ['submitPrompt', () => client.tui.submitPrompt()],
  ]) {
    try {
      const result = await call();
      await capture(`tui.${name}`, { data: result?.data, error: result?.error, status: result?.response?.status });
    } catch (error) {
      await capture(`tui.${name}_error`, { message: String(error?.message ?? error) });
    }
  }
}

export default {
  id: 'context-brake.probe',
  server: ContextBrakeProbe,
  setup() {},
};
