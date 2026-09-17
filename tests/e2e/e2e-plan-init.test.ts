import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

const PLAN_FILE = 'task_plan.json';
const CHECKPOINT_FILE = 'state_checkpoint.json';
const EXIT_INVALID_ARGUMENTS = 64;
const EXIT_ERROR = 2;

describe('E2E plan init: creation (CA-01, RF1, RF3)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-plan-init-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('creates a valid plan and checkpoint with an example step', async () => {
    const result = await runBuiltCli(['plan', 'init', '--task=refactor-auth'], tempDir);
    expect(result.code).toBe(0);
    expect((await stat(join(tempDir, PLAN_FILE))).isFile()).toBe(true);
    expect((await stat(join(tempDir, CHECKPOINT_FILE))).isFile()).toBe(true);
    const plan = JSON.parse(await readFile(join(tempDir, PLAN_FILE), 'utf8'));
    expect(plan.taskId).toBe('refactor-auth');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].status).toBe('PENDING');
    expect(plan.steps[0].validationCommand).toBeTruthy();
    const checkpoint = JSON.parse(await readFile(join(tempDir, CHECKPOINT_FILE), 'utf8'));
    expect(checkpoint.activeStepId).toBe(plan.steps[0].id);
    expect(checkpoint.workingMemory.discoveredConstraints).toEqual([]);
  });

  it('emits one JSON document naming the created files', async () => {
    const result = await runBuiltCli(['plan', 'init', '--task=refactor-auth', '--json'], tempDir);
    expect(result.code).toBe(0);
    const document = JSON.parse(result.stdout);
    expect(document.command).toBe('plan');
    expect(document.subcommand).toBe('init');
    expect(document.created).toEqual([PLAN_FILE, CHECKPOINT_FILE]);
  });
});

describe('E2E plan init: no overwrite without confirmation (CA-02, RF2)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-plan-guard-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('leaves existing files byte-for-byte identical and explains the missing confirmation', async () => {
    expect((await runBuiltCli(['plan', 'init', '--task=first'], tempDir)).code).toBe(0);
    const before = await readFile(join(tempDir, PLAN_FILE), 'utf8');
    const beforeCheckpoint = await readFile(join(tempDir, CHECKPOINT_FILE), 'utf8');
    const second = await runBuiltCli(['plan', 'init', '--task=second'], tempDir);
    expect(second.code).toBe(EXIT_ERROR);
    expect(second.stderr).toContain('CONFIRMATION_REQUIRED');
    expect(await readFile(join(tempDir, PLAN_FILE), 'utf8')).toBe(before);
    expect(await readFile(join(tempDir, CHECKPOINT_FILE), 'utf8')).toBe(beforeCheckpoint);
  });

  it('overwrites when the confirmation flag is given', async () => {
    expect((await runBuiltCli(['plan', 'init', '--task=first'], tempDir)).code).toBe(0);
    const second = await runBuiltCli(['plan', 'init', '--task=second', '--yes'], tempDir);
    expect(second.code).toBe(0);
    expect(JSON.parse(await readFile(join(tempDir, PLAN_FILE), 'utf8')).taskId).toBe('second');
  });
});

describe('E2E plan init: argument errors (RF1)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-plan-args-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('rejects a missing task name, a missing subcommand, and an unknown subcommand', async () => {
    expect((await runBuiltCli(['plan', 'init'], tempDir)).code).toBe(EXIT_INVALID_ARGUMENTS);
    expect((await runBuiltCli(['plan'], tempDir)).code).toBe(EXIT_INVALID_ARGUMENTS);
    expect((await runBuiltCli(['plan', 'status'], tempDir)).code).toBe(EXIT_INVALID_ARGUMENTS);
  });

  it('reports the plan command in the JSON error document', async () => {
    const result = await runBuiltCli(['plan', 'init', '--json'], tempDir);
    expect(result.code).toBe(EXIT_INVALID_ARGUMENTS);
    const document = JSON.parse(result.stdout);
    expect(document.command).toBe('plan');
    expect(document.error.code).toBe('INVALID_ARGUMENTS');
  });
});
