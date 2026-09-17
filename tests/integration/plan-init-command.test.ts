import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { parseStateCheckpoint } from '../../src/core/validation/checkpoint-validator.js';
import { parseTaskPlan } from '../../src/core/validation/plan-validator.js';
import { runPlanInit } from '../../src/cli/commands/plan.js';
import { ConfirmationRequiredError } from '../../src/cli/confirmation.js';
import type { ParsedPlanArgs } from '../../src/cli/plan-arguments.js';

const PLAN_FILE = 'task_plan.json';
const CHECKPOINT_FILE = 'state_checkpoint.json';

function planArgs(overrides: Partial<ParsedPlanArgs> = {}): ParsedPlanArgs {
  return { command: 'plan', subcommand: 'init', task: 'refactor-auth', yes: false, json: false, ...overrides };
}

describe('plan init command in process (RF1, RF2, CA-01, CA-02)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t02-cmd-')); vi.spyOn(process.stdout, 'write').mockImplementation(() => true); });
  afterEach(async () => { vi.restoreAllMocks(); await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('creates both files at the default paths and returns success', async () => {
    expect(await runPlanInit(planArgs(), { projectRoot: tempDir })).toBe(0);
    const plan = parseTaskPlan(JSON.parse(await readFile(join(tempDir, PLAN_FILE), 'utf8')));
    const checkpoint = parseStateCheckpoint(JSON.parse(await readFile(join(tempDir, CHECKPOINT_FILE), 'utf8')));
    expect(plan.taskId).toBe('refactor-auth');
    expect(checkpoint.activeStepId).toBe(plan.steps[0]?.id);
  });

  it('refuses to overwrite without confirmation when stdin is not a TTY (RF2)', async () => {
    await runPlanInit(planArgs(), { projectRoot: tempDir });
    const before = await readFile(join(tempDir, PLAN_FILE), 'utf8');
    await expect(runPlanInit(planArgs({ task: 'second' }), { projectRoot: tempDir })).rejects.toBeInstanceOf(ConfirmationRequiredError);
    expect(await readFile(join(tempDir, PLAN_FILE), 'utf8')).toBe(before);
  });

  it('overwrites when confirmation is given', async () => {
    await runPlanInit(planArgs(), { projectRoot: tempDir });
    expect(await runPlanInit(planArgs({ task: 'second', yes: true }), { projectRoot: tempDir })).toBe(0);
    expect(parseTaskPlan(JSON.parse(await readFile(join(tempDir, PLAN_FILE), 'utf8'))).taskId).toBe('second');
  });
});

describe('plan init configuration and output (RF1, RF20)', () => {
  let tempDir: string;
  let written: string[];
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-t02-cfg-'));
    written = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { written.push(String(chunk)); return true; });
  });
  afterEach(async () => { vi.restoreAllMocks(); await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('writes to the paths configured in context-brake.config.json', async () => {
    const config = { ...DEFAULT_CONFIG, stateStorage: { ...DEFAULT_CONFIG.stateStorage, planFile: 'state/plan.json', checkpointFile: 'state/checkpoint.json' } };
    await writeFile(join(tempDir, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
    expect(await runPlanInit(planArgs(), { projectRoot: tempDir })).toBe(0);
    expect(parseTaskPlan(JSON.parse(await readFile(join(tempDir, 'state/plan.json'), 'utf8'))).taskId).toBe('refactor-auth');
  });

  it('emits one JSON document when asked, and text otherwise', async () => {
    await runPlanInit(planArgs({ json: true }), { projectRoot: tempDir });
    const document = JSON.parse(written.join('')) as { command: string; created: string[] };
    expect(document.command).toBe('plan');
    expect(document.created).toEqual([PLAN_FILE, CHECKPOINT_FILE]);
  });

  it('names the created files in the text output', async () => {
    await runPlanInit(planArgs(), { projectRoot: tempDir });
    expect(written.join('')).toContain(PLAN_FILE);
    expect(written.join('')).toContain(CHECKPOINT_FILE);
  });
});
