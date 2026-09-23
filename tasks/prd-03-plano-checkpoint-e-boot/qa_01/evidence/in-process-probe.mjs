import { pathToFileURL } from 'node:url';

const [extensionPath, root, mode] = process.argv.slice(2);
const module = await import(pathToFileURL(extensionPath).href);
const handlers = new Map();
module.default({ on: (event, handler) => { handlers.set(event, handler); } });
const context = {
  cwd: root,
  sessionManager: { getSessionId: () => 'qa-session-1' },
  getContextUsage: () => ({ tokens: 42000, contextWindow: 128000, percent: 33 }),
  ui: { notify: () => {} },
};
if (mode === 'compact') {
  await handlers.get('session_compact')({}, context);
} else if (mode === 'autocompact') {
  await handlers.get('auto_compaction_end')({}, context);
} else {
  await handlers.get('session_start')({ reason: 'new' }, context);
}
const first = await handlers.get('before_agent_start')({}, context);
const second = await handlers.get('before_agent_start')({}, context);
console.log(JSON.stringify({ first: first ?? null, second: second ?? null }));
