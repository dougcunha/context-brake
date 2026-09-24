import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import process from 'node:process';
import type { PlanStepStatus } from '../../src/core/contracts/task-plan.js';
import { installFakeHarness, pathVariable, writeScenario, type FakeScenario } from '../support/fake-harness/install.js';
import { checkpointAt } from './run-plans.js';

export type RunProject = { readonly root: string; readonly project: string; readonly bin: string; readonly scenario: string; readonly record: string; readonly journal: string };
export type StepFixture = { readonly title: string; readonly validationCommand: string | null; readonly status?: PlanStepStatus };
export type FakeRecord = { readonly harness: string; readonly argv: string[]; readonly stdin: string; readonly runId: string | null; readonly cwd: string };

export const PASSING_COMMAND = 'node -e "process.exit(0)"';
export const MARKER_FILE = 'validated.txt';
export const MARKER_COMMAND = `node -e "require('fs').writeFileSync('${MARKER_FILE}','x')"`;
export const PLAN_FILE = 'task_plan.json';
export const CHECKPOINT_FILE = 'state_checkpoint.json';
const REAL_HARNESS_NAME = /^(claude|codex)(\.(exe|cmd|bat|ps1))?$/i;

export class RealHarnessReachableError extends Error {
  constructor(readonly executable: string) {
    super(`Refusing to run: a real harness executable ${executable} is reachable on the sealed PATH.`);
  }
}

export async function createRunProject(prefix: string): Promise<RunProject> {
  const root = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  const project = join(root, 'project');
  const bin = join(root, 'bin');
  await mkdir(project);
  await mkdir(bin);
  await installFakeHarness(bin);
  const world = { root, project, bin, scenario: join(root, 'scenario.json'), record: join(root, 'record.json'), journal: join(root, 'journal.jsonl') };
  await useScenario(world, {});
  return world;
}

export async function removeRunProject(world: RunProject): Promise<void> {
  await rm(world.root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

export async function useScenario(world: RunProject, scenario: FakeScenario): Promise<void> {
  await rm(`${world.scenario}.count`, { force: true });
  await writeScenario(world.scenario, { record: world.record, journal: world.journal, ...scenario });
}

export async function writePlan(world: RunProject, steps: readonly StepFixture[]): Promise<void> {
  const planSteps = steps.map((step, index) => ({
    id: index + 1, title: step.title, description: '', status: step.status ?? 'PENDING', validationCommand: step.validationCommand, artifactsProduced: [],
  }));
  const plan = { schemaVersion: 1, taskId: 'task', title: 'Task', currentStepId: 1, steps: planSteps };
  await writeFile(join(world.project, PLAN_FILE), `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await writeFile(join(world.project, CHECKPOINT_FILE), `${JSON.stringify(checkpointAt('2026-09-24T00:00:00.000Z'), null, 2)}\n`, 'utf8');
}

export function sealedPath(directories: readonly string[]): string {
  const system = process.platform === 'win32' ? [join(process.env['SystemRoot'] ?? 'C:\\Windows', 'System32')] : ['/usr/bin', '/bin'];
  return [...directories, dirname(process.execPath), ...system].join(delimiter);
}

export async function assertNoRealHarness(pathValue: string, fakeBin: string): Promise<void> {
  for (const directory of pathValue.split(delimiter).filter((entry) => entry !== fakeBin)) {
    const names = await readdir(directory).catch(() => [] as string[]);
    const found = names.find((name) => REAL_HARNESS_NAME.test(name));
    if (found !== undefined) throw new RealHarnessReachableError(join(directory, found));
  }
}

export async function runEnvironment(world: RunProject, options: { readonly withHarness: boolean } = { withHarness: true }): Promise<Record<string, string>> {
  const pathValue = sealedPath(options.withHarness ? [world.bin] : []);
  await assertNoRealHarness(pathValue, world.bin);
  return { [pathVariable()]: pathValue, FAKE_HARNESS_SCENARIO: world.scenario };
}

export async function readFakeRecord(world: RunProject): Promise<FakeRecord | null> {
  const source = await readFile(world.record, 'utf8').catch(() => null);
  return source === null ? null : (JSON.parse(source) as FakeRecord);
}

export async function readPlanStatuses(world: RunProject): Promise<PlanStepStatus[]> {
  const plan = JSON.parse(await readFile(join(world.project, PLAN_FILE), 'utf8')) as { steps: { status: PlanStepStatus }[] };
  return plan.steps.map((step) => step.status);
}
