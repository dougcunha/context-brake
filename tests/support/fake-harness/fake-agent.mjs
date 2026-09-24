import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'dist', 'src', 'cli', 'main.js');
const HOOK_PATHS = { claude: join('.claude', 'hooks', 'context-brake.mjs'), codex: join('.codex', 'hooks', 'context-brake.mjs') };
const PLAN_FILE = 'task_plan.json';
const CHECKPOINT_FILE = 'state_checkpoint.json';
const RUNS_DIRECTORY = join('.context-brake', 'runtime', 'runner', 'runs');
const SESSION_REGISTRATION_ATTEMPTS = 100;
const SESSION_REGISTRATION_POLL_MILLISECONDS = 50;

export function activeStepOf(prompt) {
  const match = prompt.match(/Work only on step (\d+):/);
  return match === null ? null : Number(match[1]);
}

function capture(command, args, options) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('error', (error) => resolvePromise({ code: null, stdout, stderr: String(error) }));
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }));
    child.stdin.end(options.input ?? '');
  });
}

export async function runHook(agent, event, payload) {
  const hook = join(process.cwd(), HOOK_PATHS[agent.harness]);
  if (!existsSync(hook)) return null;
  const environment = { ...process.env, CLAUDE_PROJECT_DIR: process.cwd() };
  const result = await capture(process.execPath, [hook, event], { cwd: process.cwd(), env: environment, input: JSON.stringify({ ...payload, hook_event_name: event, session_id: agent.sessionId, cwd: process.cwd() }) });
  return result.stdout;
}

export function toolPayload(agent) {
  const characters = agent.session.toolCharacters ?? 200;
  return { tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_use_id: `fake-tool-${agent.index}`, tool_response: 'x'.repeat(characters) };
}

async function readJson(file) {
  return JSON.parse(await readFile(join(process.cwd(), file), 'utf8'));
}

async function writeJson(file, value) {
  await writeFile(join(process.cwd(), file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function doWork(agent) {
  if (!agent.session.work || agent.stepId === null) return;
  await mkdir(join(process.cwd(), 'work'), { recursive: true });
  await writeFile(join(process.cwd(), 'work', `step-${agent.stepId}.txt`), `session ${agent.index}\n`, 'utf8');
}

export async function markComplete(agent) {
  if (!agent.session.markComplete || agent.stepId === null) return;
  const plan = await readJson(PLAN_FILE);
  await writeJson(PLAN_FILE, { ...plan, steps: plan.steps.map((step) => (step.id === agent.stepId ? { ...step, status: 'COMPLETED' } : step)) });
}

export async function writeCheckpoint(agent) {
  if (!agent.session.checkpoint) return;
  const plan = await readJson(PLAN_FILE);
  await writeJson(CHECKPOINT_FILE, {
    schemaVersion: 1, taskId: plan.taskId, activeStepId: agent.stepId, modifiedFiles: [], timestamp: new Date().toISOString(),
    gitState: { branch: 'main', lastCommitHash: null, cleanWorkingTree: null },
    workingMemory: { discoveredConstraints: [], decisionsMade: [], blockedItems: [], breakingChanges: [] },
  });
}

async function sessionRegistered(agent) {
  const runId = process.env.CONTEXT_BRAKE_RUN_ID;
  if (runId === undefined) return false;
  const source = await readFile(join(process.cwd(), RUNS_DIRECTORY, runId, 'run.json'), 'utf8').catch(() => '');
  return source.includes(`"${agent.sessionId}"`);
}

export async function runWrap(agent) {
  const wrap = agent.session.wrap;
  if (wrap === undefined) return;
  for (let attempt = 0; attempt < SESSION_REGISTRATION_ATTEMPTS && !(await sessionRegistered(agent)); attempt += 1) {
    await delay(SESSION_REGISTRATION_POLL_MILLISECONDS);
  }
  const result = await capture(process.execPath, [CLI_PATH, 'wrap', '--', ...wrap.argv], { cwd: process.cwd(), env: process.env });
  await writeFile(wrap.output, JSON.stringify(result), 'utf8');
}
