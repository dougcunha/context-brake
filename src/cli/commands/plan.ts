import { resolve } from 'node:path';
import type { ContextBrakeConfig } from '../../core/contracts/configuration.js';
import { DEFAULT_CONFIG } from '../../core/contracts/configuration.js';
import { buildInitialCheckpoint, buildInitialPlan } from '../../core/services/plan-scaffold.js';
import { NodeCheckpointStore } from '../../infrastructure/storage/checkpoint-store.js';
import { NodePlanStore } from '../../infrastructure/storage/plan-store.js';
import { ProjectConfigStore } from '../../infrastructure/storage/project-config-store.js';
import type { ParsedPlanArgs } from '../plan-arguments.js';
import { authorizeWrite } from '../confirmation.js';
import { EXIT_CODES } from '../exit-codes.js';
import { renderJsonOutput } from '../output/json.js';
import { renderPlanInitText } from '../output/text.js';
import type { CommandEnv } from './init.js';

export type PlanInitResult = {
  schemaVersion: 1;
  command: 'plan';
  subcommand: 'init';
  status: 'success';
  exitCode: 0;
  taskId: string;
  created: readonly string[];
};

async function loadConfig(root: string): Promise<ContextBrakeConfig> {
  const store = new ProjectConfigStore(resolve(root, 'context-brake.config.json'));
  try {
    return await store.read();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return DEFAULT_CONFIG;
    throw error;
  }
}

type StateFilePresence = {
  readonly path: string;
  readonly exists: boolean;
};

function existingFiles(entries: readonly StateFilePresence[]): string[] {
  return entries.filter((entry) => entry.exists).map((entry) => entry.path);
}

export async function runPlanInit(args: ParsedPlanArgs, env: CommandEnv): Promise<number> {
  const config = await loadConfig(env.projectRoot);
  const { planFile, checkpointFile } = config.stateStorage;
  const planStore = new NodePlanStore(resolve(env.projectRoot, planFile));
  const checkpointStore = new NodeCheckpointStore(resolve(env.projectRoot, checkpointFile));
  const present = existingFiles([
    { path: planFile, exists: await planStore.exists() },
    { path: checkpointFile, exists: await checkpointStore.exists() },
  ]);
  const confirmed = await authorizeWrite(args.yes, present.length > 0, `Overwrite existing ${present.join(' and ')}?`);
  if (!confirmed) return EXIT_CODES.healthy;
  const scaffold = { taskId: args.task, now: new Date() };
  await planStore.write(buildInitialPlan(scaffold));
  await checkpointStore.write(buildInitialCheckpoint(scaffold));
  const result: PlanInitResult = {
    schemaVersion: 1, command: 'plan', subcommand: 'init', status: 'success',
    exitCode: EXIT_CODES.healthy, taskId: args.task, created: [planFile, checkpointFile],
  };
  if (args.json) {
    renderJsonOutput(result);
  } else {
    renderPlanInitText(result);
  }
  return EXIT_CODES.healthy;
}

export function runPlan(args: ParsedPlanArgs, env: CommandEnv): Promise<number> {
  return runPlanInit(args, env);
}
