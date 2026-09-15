export const counters = { toolCalls: 0, beforeAgentStart: 0, badContext: 0 };

function hasContext(ctx) {
  return typeof ctx?.getContextUsage === 'function'
    && typeof ctx?.sessionManager?.getSessionId === 'function'
    && typeof ctx?.ui?.notify === 'function';
}

export default function register(api) {
  api.on('tool_call', async (event, ctx) => {
    counters.toolCalls += 1;
    if (!hasContext(ctx)) counters.badContext += 1;
    return {};
  });
  api.on('tool_result', async () => ({}));
  api.on('before_agent_start', async () => {
    counters.beforeAgentStart += 1;
    return {};
  });
}
