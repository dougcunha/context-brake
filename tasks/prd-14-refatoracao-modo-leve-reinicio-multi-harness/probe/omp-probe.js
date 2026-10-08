import { createCapture, endsWithMarker, SEED, textOf } from './capture.js';

const COMMAND = 'context-brake-probe-restart';
const state = { restarts: 0, strategy: 'send-user-message' };

export default function ompProbe(pi) {
  const capture = createCapture('omp', process.cwd());
  void capture('loaded', { cwd: process.cwd() });

  pi.on('session_start', async (event, ctx) => {
    await capture('session_start', { event, mode: ctx.mode, hasUI: ctx.hasUI, sessionId: ctx.sessionManager?.getSessionId?.(), state: { ...state } });
  });
  pi.on('agent_start', async (event) => capture('agent_start', { event, at: Date.now() }));
  pi.on('input', async (event) => capture('input', { text: event.text, source: event.source }));
  pi.on('session_stop', async (event, ctx) => {
    const text = textOf(event.last_assistant_message);
    await capture('session_stop', { turnId: event.turn_id, sessionId: event.session_id, lastAssistantText: text, marker: endsWithMarker(text), mode: ctx.mode, hasUI: ctx.hasUI });
    if (!endsWithMarker(text)) return;
    try {
      if (state.strategy === 'send-user-message') {
        state.strategy = 'editor-text';
        await capture('dispatch', { via: 'pi.sendUserMessage' });
        pi.sendUserMessage(`/${COMMAND}`);
        return;
      }
      await capture('dispatch', { via: 'ctx.ui.setEditorText' });
      ctx.ui.setEditorText(`/${COMMAND}`);
    } catch (error) {
      await capture('dispatch_error', { message: String(error?.message ?? error) });
    }
  });

  pi.registerCommand(COMMAND, {
    description: 'ContextBrake probe: open a new session and seed it',
    handler: async (args, ctx) => {
      await capture('command', { args, hasNewSession: typeof ctx.newSession === 'function' });
      try {
        state.restarts += 1;
        const result = await ctx.newSession();
        await capture('new_session_result', { result, sessionId: ctx.sessionManager?.getSessionId?.() });
        pi.sendUserMessage(SEED);
        await capture('seed_sent', {});
      } catch (error) {
        await capture('new_session_error', { message: String(error?.message ?? error) });
      }
    },
  });
}
