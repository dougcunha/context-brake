import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeRuntimeConfig } from './runtime-seed.js';

export const VALID_BOOT_PLAN = {
  schemaVersion: 1,
  taskId: 'task-alpha',
  title: 'Alpha Task',
  currentStepId: 3,
  steps: [
    { id: 1, title: 'Setup', status: 'COMPLETED', validationCommand: 'npm test' },
    { id: 2, title: 'Scaffold', status: 'COMPLETED', validationCommand: 'npm test' },
    { id: 3, title: 'Implement core', status: 'IN_PROGRESS', validationCommand: 'npm run check' },
    { id: 4, title: 'Add tests', status: 'PENDING', validationCommand: 'npm test' },
  ],
};

export const VALID_BOOT_CHECKPOINT = {
  schemaVersion: 1,
  taskId: 'task-alpha',
  activeStepId: 3,
  gitState: { branch: 'main', lastCommitHash: null, cleanWorkingTree: null },
  workingMemory: {
    discoveredConstraints: ['Must not exceed token budget', 'No UI or server components'],
    decisionsMade: ['Use hexagonal ports'],
    blockedItems: [],
    breakingChanges: [],
  },
  modifiedFiles: ['src/core/a.ts'],
  timestamp: '2026-09-21T12:00:00.000Z',
};

export async function seedValidBoot(root: string): Promise<void> {
  await writeRuntimeConfig(root);
  await writeFile(join(root, 'task_plan.json'), JSON.stringify(VALID_BOOT_PLAN), 'utf8');
  await writeFile(join(root, 'state_checkpoint.json'), JSON.stringify(VALID_BOOT_CHECKPOINT), 'utf8');
}

export async function seedCompletedBoot(root: string): Promise<void> {
  await writeRuntimeConfig(root);
  const plan = {
    ...VALID_BOOT_PLAN,
    currentStepId: null,
    steps: VALID_BOOT_PLAN.steps.map((step) => ({ ...step, status: 'COMPLETED' })),
  };
  await writeFile(join(root, 'task_plan.json'), JSON.stringify(plan), 'utf8');
  await writeFile(join(root, 'state_checkpoint.json'), JSON.stringify(VALID_BOOT_CHECKPOINT), 'utf8');
}

export async function seedMalformedCheckpoint(root: string): Promise<void> {
  await writeRuntimeConfig(root);
  await writeFile(join(root, 'task_plan.json'), JSON.stringify(VALID_BOOT_PLAN), 'utf8');
  await writeFile(join(root, 'state_checkpoint.json'), '{"schemaVersion": 1, SECRET CHECKPOINT INVALID JSON', 'utf8');
}

export async function seedMalformedPlan(root: string): Promise<void> {
  await writeRuntimeConfig(root);
  await writeFile(join(root, 'task_plan.json'), '{"schemaVersion": 1, SECRET PLAN INVALID JSON', 'utf8');
  await writeFile(join(root, 'state_checkpoint.json'), JSON.stringify(VALID_BOOT_CHECKPOINT), 'utf8');
}

type Handler = (payload: unknown, context?: unknown) => Promise<unknown>;

export async function loadPiHandlers(): Promise<Map<string, Handler>> {
  const module = (await import(pathToFileURL(resolve('dist/assets/runtime/pi-extension.js')).href)) as { default: (api: unknown) => void };
  const handlers = new Map<string, Handler>();
  module.default({ on: (event: string, handler: Handler) => { handlers.set(event, handler); } });
  return handlers;
}

export async function loadOmpHandlers(): Promise<Map<string, Handler>> {
  const module = (await import(pathToFileURL(resolve('dist/assets/runtime/omp-extension.js')).href)) as { default: (api: unknown) => void };
  const handlers = new Map<string, Handler>();
  module.default({ on: (event: string, handler: Handler) => { handlers.set(event, handler); } });
  return handlers;
}
