import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildInitialCheckpoint, buildInitialPlan } from '../../src/core/services/plan-scaffold.js';
import { InvalidCheckpointError } from '../../src/core/validation/checkpoint-validator.js';
import { InvalidPlanError } from '../../src/core/validation/plan-validator.js';
import { NodeCheckpointStore } from '../../src/infrastructure/storage/checkpoint-store.js';
import { NodePlanStore } from '../../src/infrastructure/storage/plan-store.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

const PLAN_FILE = 'task_plan.json';
const CHECKPOINT_FILE = 'state_checkpoint.json';
const scaffold = { taskId: 'refactor-auth', now: new Date('2026-09-17T10:00:00.000Z') };

describe('plan and checkpoint stores (RF1, RF7, TC-01)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t02-store-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('writes and reads back a valid plan and checkpoint', async () => {
    const planStore = new NodePlanStore(join(tempDir, PLAN_FILE));
    const checkpointStore = new NodeCheckpointStore(join(tempDir, CHECKPOINT_FILE));
    await planStore.write(buildInitialPlan(scaffold));
    await checkpointStore.write(buildInitialCheckpoint(scaffold));
    expect((await planStore.read()).taskId).toBe(scaffold.taskId);
    expect((await checkpointStore.read()).taskId).toBe(scaffold.taskId);
  });
  it('reports existence only for a present file', async () => {
    const planStore = new NodePlanStore(join(tempDir, PLAN_FILE));
    expect(await planStore.exists()).toBe(false);
    await planStore.write(buildInitialPlan(scaffold));
    expect(await planStore.exists()).toBe(true);
  });
  it('leaves no temporary file behind after an atomic write', async () => {
    await new NodePlanStore(join(tempDir, PLAN_FILE)).write(buildInitialPlan(scaffold));
    const entries = await readdir(tempDir);
    expect(entries).toEqual([PLAN_FILE]);
  });
  it('writes JSON with a trailing newline and two-space indentation', async () => {
    await new NodePlanStore(join(tempDir, PLAN_FILE)).write(buildInitialPlan(scaffold));
    const content = await readFile(join(tempDir, PLAN_FILE), 'utf8');
    expect(content.endsWith('\n')).toBe(true);
    expect(content).toContain('\n  "taskId"');
  });
});

describe('store validation failures (RF7, RF11)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t02-invalid-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('reports malformed plan JSON with the file path and syntax rule', async () => {
    const file = join(tempDir, PLAN_FILE);
    await writeFile(file, '{', 'utf8');
    let captured: unknown;
    try { await new NodePlanStore(file).read(); } catch (error) { captured = error; }
    expect(captured).toBeInstanceOf(InvalidPlanError);
    expect((captured as InvalidPlanError).filePath).toBe(file);
    expect((captured as InvalidPlanError).issues[0]).toEqual({ path: '(syntax)', received: '{', rule: 'must be valid JSON' });
  });
  it('reports malformed checkpoint JSON as a checkpoint error', async () => {
    const file = join(tempDir, CHECKPOINT_FILE);
    await writeFile(file, 'not json', 'utf8');
    await expect(new NodeCheckpointStore(file).read()).rejects.toBeInstanceOf(InvalidCheckpointError);
  });
  it('attaches the file path to schema violations', async () => {
    const file = join(tempDir, PLAN_FILE);
    await writeFile(file, JSON.stringify({ schemaVersion: 1, taskId: 'a', title: 'a', steps: [{ id: 1 }] }), 'utf8');
    let captured: unknown;
    try { await new NodePlanStore(file).read(); } catch (error) { captured = error; }
    expect(captured).toBeInstanceOf(InvalidPlanError);
    expect((captured as InvalidPlanError).filePath).toBe(file);
  });
});

describe('symlinked state file (file-changes.md)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-t02-link-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('writes through a symlink so the link survives', async (ctx) => {
    const target = join(tempDir, 'real-plan.json');
    const link = join(tempDir, PLAN_FILE);
    await writeFile(target, JSON.stringify(buildInitialPlan(scaffold)), 'utf8');
    await requireLink(ctx, await attemptLink(target, link, 'file'), link);
    await new NodePlanStore(link).write(buildInitialPlan({ ...scaffold, taskId: 'renamed' }));
    expect(JSON.parse(await readFile(target, 'utf8')).taskId).toBe('renamed');
  });
});
