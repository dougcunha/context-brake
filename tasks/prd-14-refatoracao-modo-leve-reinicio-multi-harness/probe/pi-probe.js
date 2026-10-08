import { createCapture, endsWithMarker, MARKER, SEED, textOf } from './capture.js';

const COMMAND = 'context-brake-probe-restart';
const state = { restarts: 0, toolResults: 0 };

export default function piProbe(pi) {
  const capture = createCapture('pi', process.cwd());
  void capture('loaded', { cwd: process.cwd(), state: { ...state } });

  pi.on('session_start', async (event, ctx) => {
    await capture('session_start', { event, mode: ctx.mode, hasUI: ctx.hasUI, sessionId: ctx.sessionManager?.getSessionId?.(), state: { ...state } });
  });
  pi.on('agent_start', async (event) => capture('agent_start', { event, at: Date.now() }));
  pi.on('input', async (event) => capture('input', { text: event.text, source: event.source, streamingBehavior: event.streamingBehavior }));
  pi.on('tool_result', async (event) => { state.toolResults += 1; await capture('tool_result', { toolName: event.toolName }); });
  pi.on('message_end', async (event) => capture('message_end', { role: event.message?.role, text: textOf(event.message) }));
  pi.on('agent_end', async (event, ctx) => {
    const last = [...(event.messages ?? [])].reverse().find((message) => message.role === 'assistant');
    const text = textOf(last);
    await capture('agent_end', { messageCount: event.messages?.length, lastAssistantText: text, marker: endsWithMarker(text), mode: ctx.mode, hasUI: ctx.hasUI });
    if (!endsWithMarker(text)) return;
    try {
      await capture('dispatch', { via: 'pi.sendUserMessage', command: `/${COMMAND}`, expandPromptTemplates: true });
      await pi.sendUserMessage(`/${COMMAND}`, { expandPromptTemplates: true });
      await capture('dispatch_returned', {});
    } catch (error) {
      await capture('dispatch_error', { message: String(error?.message ?? error) });
    }
  });

  pi.registerCommand(COMMAND, {
    description: 'ContextBrake probe: open a new session and seed it',
    handler: async (args, ctx) => {
      await capture('command', { args, hasNewSession: typeof ctx.newSession === 'function', sessionId: ctx.sessionManager?.getSessionId?.() });
      try {
        state.restarts += 1;
        const result = await ctx.newSession({
          withSession: async (next) => {
            await capture('with_session', { sessionId: next.sessionManager?.getSessionId?.(), state: { ...state } });
            await next.sendUserMessage(SEED);
            await capture('seed_sent', {});
          },
        });
        await capture('new_session_result', { result });
      } catch (error) {
        await capture('new_session_error', { message: String(error?.message ?? error) });
      }
    },
  });
  void capture('marker', { MARKER });
}
