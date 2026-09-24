import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RunnerConfiguration } from '../../src/core/contracts/runner-configuration.js';
import { runSummarySchema, type RunSummary } from '../../src/core/contracts/run-summary.js';
import { runBuiltCli, type CliRunResult } from '../e2e/cli-runner.js';
import { CHECKPOINT_FILE, PLAN_FILE, runEnvironment, writePlan, type RunProject, type StepFixture } from './run-project.js';

export type AcceptanceHarness = 'claude-code' | 'codex-cli';
export type JournalEntry = { readonly index: number; readonly sessionId: string; readonly stepId: number | null; readonly stdin: string; readonly runId: string | null; readonly boot: string | null };
export type AcceptanceRun = CliRunResult & { readonly summary: RunSummary };
export type StateBytes = { readonly plan: string; readonly checkpoint: string };
type ProjectOptions = { readonly harness: AcceptanceHarness; readonly steps: readonly StepFixture[]; readonly runner?: Partial<RunnerConfiguration> };

export const ACCEPTANCE_FIXTURE = resolve('tests', 'fixtures', 'runner', 'acceptance-project');
export const CEILING_TOOL_CHARACTERS = 450_000;
const RUNS_DIRECTORY = join('.context-brake', 'runtime', 'runner', 'runs');

export class AcceptanceSetupError extends Error {
  constructor(readonly detail: string) {
    super(`context-brake init failed for the acceptance fixture: ${detail}`);
  }
}

export function workCommand(stepId: number): string {
  return `node -e "process.exit(require('fs').existsSync('work/step-${stepId}.txt') ? 0 : 1)"`;
}

export function workSteps(count: number): StepFixture[] {
  return Array.from({ length: count }, (_, index) => ({ title: `Build part ${index + 1}`, validationCommand: workCommand(index + 1) }));
}

export async function prepareAcceptanceProject(world: RunProject, options: ProjectOptions): Promise<void> {
  await cp(ACCEPTANCE_FIXTURE, world.project, { recursive: true });
  const init = await runBuiltCli(['init', '--yes', '--harness', options.harness], world.project, await runEnvironment(world, { withHarness: false }));
  if (init.code !== 0) throw new AcceptanceSetupError(init.stderr);
  const configPath = join(world.project, 'context-brake.config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8')) as { runner?: Partial<RunnerConfiguration> };
  await writeFile(configPath, `${JSON.stringify({ ...config, runner: { ...config.runner, criticalGraceSeconds: 1, ...options.runner } }, null, 2)}\n`, 'utf8');
  await writePlan(world, options.steps);
}

export async function runAcceptance(world: RunProject, args: readonly string[]): Promise<AcceptanceRun> {
  const result = await runBuiltCli(['run', '--approve-commands', '--json', ...args], world.project, await runEnvironment(world));
  const summary = runSummarySchema.parse(JSON.parse(result.stdout));
  return { ...result, summary };
}

export async function readJournal(world: RunProject): Promise<JournalEntry[]> {
  const source = await readFile(world.journal, 'utf8').catch(() => '');
  return source.trim() === '' ? [] : source.trim().split('\n').map((line) => JSON.parse(line) as JournalEntry);
}

export async function readStateBytes(world: RunProject): Promise<StateBytes> {
  return { plan: await readFile(join(world.project, PLAN_FILE), 'utf8'), checkpoint: await readFile(join(world.project, CHECKPOINT_FILE), 'utf8') };
}

export async function readRunRecord(world: RunProject, runId: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(world.project, RUNS_DIRECTORY, runId, 'run.json'), 'utf8')) as Record<string, unknown>;
}
