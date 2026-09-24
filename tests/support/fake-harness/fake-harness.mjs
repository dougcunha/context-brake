import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { setInterval } from 'node:timers';
import { activeStepOf, doWork, markComplete, runHook, runWrap, toolPayload, writeCheckpoint } from './fake-agent.mjs';

const [harness, ...argv] = process.argv.slice(2);
const scenarioPath = process.env.FAKE_HARNESS_SCENARIO;
const scenario = scenarioPath ? JSON.parse(readFileSync(scenarioPath, 'utf8')) : {};

function nextIndex() {
  if (!scenarioPath) return 1;
  const counter = scenario.counter ?? `${scenarioPath}.count`;
  let previous = 0;
  try { previous = Number(readFileSync(counter, 'utf8')); } catch { previous = 0; }
  writeFileSync(counter, String(previous + 1), 'utf8');
  return previous + 1;
}

const index = nextIndex();
const { sessions = [], record, journal, ...defaults } = scenario;
const session = { ...defaults, ...(sessions[index - 1] ?? {}) };
const sessionId = session.sessionId ?? `fake-session-${index}`;
const finalText = session.finalText ?? '[REQUEST_SESSION_RESET]';
const tokens = session.tokens ?? 1000;

function emit(value) {
  process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
}

function readStdin() {
  return new Promise((resolve) => {
    let text = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { text += chunk; });
    process.stdin.on('end', () => resolve(text));
  });
}

const claude = {
  hooks: 'claude',
  started: () => ({ type: 'system', subtype: 'init', session_id: sessionId, cwd: process.cwd(), tools: [], model: 'fake' }),
  message: () => ({ type: 'assistant', message: { content: [{ type: 'text', text: finalText }] }, session_id: sessionId }),
  finished: (failure) => ({
    type: 'result', subtype: 'success', is_error: failure !== undefined, result: failure ?? finalText, session_id: sessionId,
    usage: { input_tokens: tokens - 100, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  }),
};

const codex = {
  hooks: 'codex',
  started: () => ({ type: 'thread.started', thread_id: sessionId }),
  message: () => ({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text: finalText } }),
  finished: (failure) => failure === undefined
    ? { type: 'turn.completed', usage: { input_tokens: tokens - 100, cached_input_tokens: 0, output_tokens: 100, reasoning_output_tokens: 0 } }
    : { type: 'turn.failed', error: { message: failure } },
};

function hang(options) {
  const script = options.ignoreChildInterrupt
    ? 'process.on("SIGINT", () => undefined);'
    : '';
  const childScript = `${script} if (process.argv[1]) require('node:fs').writeFileSync(process.argv[1], 'ready'); setInterval(() => undefined, 1000)`;
  const sleeper = spawn(process.execPath, ['-e', childScript, options.readyFile ?? ''], { stdio: 'ignore' });
  if (options.pidFile !== undefined) writeFileSync(options.pidFile, JSON.stringify({ pids: [process.pid, sleeper.pid] }), 'utf8');
  if (options.exitLeader) process.exit(0);
  if (session.ignoreInterrupt) process.on('SIGINT', () => undefined);
  setInterval(() => undefined, 1_000);
}

async function act(agent) {
  const boot = await runHook(agent, 'SessionStart', { source: 'startup' });
  await doWork(agent);
  await markComplete(agent);
  await runWrap(agent);
  await runHook(agent, 'PostToolUse', toolPayload(agent));
  await writeCheckpoint(agent);
  return boot;
}

const stream = harness === 'codex' ? codex : claude;
const stdin = await readStdin();
const runId = process.env.CONTEXT_BRAKE_RUN_ID ?? null;
if (record) writeFileSync(record, JSON.stringify({ harness, argv, stdin, runId, cwd: process.cwd() }), 'utf8');
emit(stream.started());
const agent = { harness: stream.hooks, index, sessionId, stepId: activeStepOf(stdin), session };
const boot = await act(agent);
if (journal) appendFileSync(journal, `${JSON.stringify({ index, harness, sessionId, stepId: agent.stepId, stdin, runId, boot })}\n`, 'utf8');
for (const line of session.noise ?? []) emit(line);
if (session.hang) {
  hang(session.hang);
} else {
  if (session.failure === undefined) emit(stream.message());
  emit(stream.finished(session.failure));
  process.exitCode = session.exitCode ?? (session.failure === undefined ? 0 : 1);
}
