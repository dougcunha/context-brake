import { createHash } from 'node:crypto';
import type { HarnessSessionExit, HarnessSessionProcess, HarnessSessionRequest, LedgerWatcher, RunningValidation, RunStore, SessionLauncher, ValidationExecutor } from '../../src/core/contracts/run-ports.js';
import { RUNNER_DEFAULTS, type RunnerConfiguration } from '../../src/core/contracts/runner-configuration.js';
import type { RunContext, RunDependencies } from '../../src/core/services/run-context.js';
import type { RunWorld, SessionScript } from './run-world.js';

const VALIDATION_MS = 500;

function launcher(): SessionLauncher {
  return { harness: 'claude-code', executableNames: ['claude'], buildCommand: (request) => ({ executable: 'claude', args: ['-p', ...request.harnessArgs], stdin: request.prompt }), parseLine: () => [] };
}

function sessions(world: RunWorld): HarnessSessionProcess {
  return { start: (request) => startSession(world, request, world.sessions.shift() ?? {}) };
}

function startSession(world: RunWorld, request: HarnessSessionRequest, script: SessionScript): ReturnType<HarnessSessionProcess['start']> {
  world.launches.push({ command: request.command, environment: request.environment });
  world.watchZone = script.zone ?? null;
  world.watchFinalReading = script.finalReading ?? null;
  script.agent?.(world);
  for (const event of script.events ?? []) request.onEvent(event);
  const holder: { release?: (exit: HarnessSessionExit) => void } = {};
  const exit = new Promise<HarnessSessionExit>((resolve) => { holder.release = resolve; });
  if (!script.hang) holder.release?.({ exitCode: script.exitCode ?? 0, spawnFailed: script.spawnFailed ?? false, unparsedLines: script.spawnFailed ? 0 : script.unparsedLines ?? 0 });
  return { exit, stop: async () => { world.stops += 1; holder.release?.({ exitCode: 143, spawnFailed: false, unparsedLines: script.unparsedLines ?? 0 }); } };
}

function validator(world: RunWorld): ValidationExecutor {
  return { start: (request) => startValidation(world, request.command) };
}

function startValidation(world: RunWorld, command: string): RunningValidation {
  world.validationCommands.push(command);
  const script = world.validations.shift() ?? 'hang';
  if (script === 'interrupt') world.interruptRequested = true;
  if (script === 'hang' || script === 'interrupt') return { outcome: new Promise(() => undefined), stop: async () => { world.stops += 1; } };
  world.nowMs += VALIDATION_MS;
  return { outcome: Promise.resolve({ ...script, durationMs: VALIDATION_MS }), stop: async () => undefined };
}

function store(world: RunWorld): RunStore {
  return {
    writeRecord: async (record) => { world.records.push(record); },
    readRecord: async () => world.previousRun,
    appendSession: async (_runId, line) => { world.lines.push(line); },
    latestRunId: async () => world.previousRun?.runId ?? null,
    snapshotState: async () => { world.snapshots += 1; },
    restoreState: async (_runId, files) => { world.restored.push(files); },
    pruneRuns: async () => { world.pruned += 1; return 0; },
  };
}

function watcher(world: RunWorld): LedgerWatcher {
  return { watch: (_key, onReading) => {
    const reading = { zone: world.watchZone, tokens: world.watchZone === null ? null : { value: 90_000, source: 'estimated' as const } };
    if (world.watchZone !== null) onReading(reading);
    return { latest: () => reading, stop: async () => {
      const final = world.watchFinalReading ?? reading;
      onReading(final);
      return final;
    } };
  } };
}

export function dependencies(world: RunWorld): RunDependencies {
  return {
    launcher: launcher(), sessions: sessions(world), validator: validator(world), store: store(world),
    approvals: { read: async () => world.approvals, write: async (file) => { world.approvals = file; } },
    commandApprover: { approve: async (commands) => { world.commandRequests.push(commands); return world.commandAnswers.shift() ?? true; } },
    stepApprover: world.stepAnswers === null ? null : { approve: async (step) => { world.stepRequests.push(step); return world.stepAnswers?.shift() ?? false; } },
    watcher: watcher(world), clock: { now: () => world.now() }, timer: { wait: async (ms) => { world.nowMs += ms; } },
    interrupt: { isRequested: () => world.interruptRequested },
    state: { read: async () => ({ plan: world.plan, checkpoint: world.checkpoint }), writePlan: async (plan) => { world.plan = plan; world.planWrites.push(plan); } },
    boot: { estimate: async () => 640 }, hasher: { sha256: (text) => createHash('sha256').update(text).digest('hex') },
    progress: { onProgress: (event) => { world.progress.push(event); if (event.kind === 'session_finished') world.afterSession?.(world); } },
  };
}

export function runContext(world: RunWorld, limits: Partial<RunnerConfiguration> = {}): RunContext {
  const files = { planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', protocolFile: 'docs/context-brake-protocol.md' };
  return { deps: dependencies(world), settings: { runId: 'run-1', harnessArgs: [], limits: { ...RUNNER_DEFAULTS, ...limits }, files } };
}
