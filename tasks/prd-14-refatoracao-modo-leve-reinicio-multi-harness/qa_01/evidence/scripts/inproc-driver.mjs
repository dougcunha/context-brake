// Child process: loads the installed (built) Pi or Oh-My-Pi extension files from a fixture and drives them with a fake host.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , root, harness, scenario] = process.argv;
const FIX = 'D:/MyProjects/ContextBrake/tests/fixtures/harnesses';
const dir = harness === 'pi' ? '.pi/extensions' : '.omp/extensions';
const handlers = new Map();
const commands = new Map();
const out = { seeds: [], dispatched: [], notices: [], editor: '', boots: [] };
let sessionId = `${harness}-s1`;
const tick = async () => { for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 5)); };
const fx = async (name) => JSON.parse(await readFile(join(FIX, harness, name), 'utf8'));
const mode = scenario === 'print' ? 'print' : 'tui';

function context() {
  return {
    cwd: root, mode, hasUI: mode === 'tui',
    sessionManager: { getSessionId: () => sessionId },
    getContextUsage: () => undefined,
    ui: { notify: (t) => out.notices.push(t), getEditorText: () => out.editor, setEditorText: (t) => { out.editor = t; } },
    newSession: async (options) => {
      sessionId = `${harness}-s${Number(sessionId.split('-s').pop()) + 1}`;
      await fire(harness === 'pi' ? 'session_start' : 'session_switch', harness === 'pi' ? await fx('session-start-new.json') : { type: 'session_switch', reason: 'new' });
      if (options?.withSession) await options.withSession({ sendUserMessage: async (t) => { out.seeds.push(t); } });
      return { cancelled: false };
    },
  };
}
async function fire(event, payload = {}) {
  const results = [];
  for (const h of handlers.get(event) ?? []) results.push(await h(payload, context()));
  return results;
}
const api = {
  on: (event, h) => { if (!handlers.has(event)) handlers.set(event, []); handlers.get(event).push(h); },
  registerCommand: (name, c) => commands.set(`/${name}`, c),
  sendUserMessage: async (text) => {
    out.dispatched.push(text);
    if (commands.has(text)) await commands.get(text).handler('', context());
    else out.seeds.push(text);
  },
};
for (const file of ['context-brake.js', 'context-brake-restart.js']) {
  const mod = await import(pathToFileURL(join(root, dir, file)).href);
  mod.default(api);
}
await fire('session_start', harness === 'pi' ? { type: 'session_start', reason: 'startup' } : { type: 'session_start' });
const writeHandoff = async () => { await mkdir(join(root, '.context-brake'), { recursive: true }); await writeFile(join(root, '.context-brake/handoff.md'), '# Goal\nresume QA\n'); };
const stopPayload = harness === 'pi' ? await fx('agent-end-reset.json') : await fx('session-stop-reset.json');
const endEvent = harness === 'pi' ? 'agent_end' : 'session_stop';
async function signalTurn({ handoff = 'fresh' } = {}) {
  if (handoff === 'stale') { await writeHandoff(); await new Promise((r) => setTimeout(r, 30)); }
  await fire('agent_start', { type: 'agent_start' });
  await fire('tool_result', await fx('tool-result.json'));
  if (handoff === 'fresh') { await new Promise((r) => setTimeout(r, 30)); await writeHandoff(); }
  await fire(endEvent, stopPayload);
  await tick();
  if (harness === 'oh-my-pi' && out.editor === '/context-brake-restart') {
    out.editor = '';
    await fire('input', { type: 'input', text: '/context-brake-restart', source: 'interactive' });
    await commands.get('/context-brake-restart').handler('', context());
    await tick();
  }
}
const plan = {
  fresh: [{}], stale: [{ handoff: 'stale' }], missing: [{ handoff: 'none' }], env: [{}], print: [{}],
  limit: [{}, {}, {}, 'typed', {}],
};
for (const step of plan[scenario]) {
  if (step === 'typed') { await fire('input', { type: 'input', text: 'continue with the next step', source: 'interactive' }); continue; }
  await signalTurn(step);
}
const boot = await fire('before_agent_start', { type: 'before_agent_start' });
out.boots = boot.filter((b) => b !== undefined);
const logDir = join(root, '.context-brake/runtime/restart', harness);
out.logs = {};
for (const f of await readdir(logDir).catch(() => [])) out.logs[f] = JSON.parse(await readFile(join(logDir, f), 'utf8'));
out.archive = await readdir(join(root, '.context-brake/handoffs')).catch(() => []);
console.log(JSON.stringify(out));
