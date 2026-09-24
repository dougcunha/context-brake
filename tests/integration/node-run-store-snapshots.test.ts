import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeRunStore } from '../../src/infrastructure/runner/node-run-store.js';
import { runDirectory } from '../../src/infrastructure/runner/run-paths.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

const VALID_PLAN = '{\n  "plan": "valid"\n}\n';
const VALID_CHECKPOINT = '{\n  "checkpoint": "valid"\n}\n';
const CORRUPT = '{"plan": ';

let projectRoot: string;
let planPath: string;
let checkpointPath: string;
let store: NodeRunStore;
beforeEach(async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'cb-t05-snapshot-'));
  planPath = join(projectRoot, 'task_plan.json');
  checkpointPath = join(projectRoot, 'state_checkpoint.json');
  store = new NodeRunStore({ projectRoot, stateFiles: { plan: planPath, checkpoint: checkpointPath } });
});
afterEach(async () => { await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('run state restore (TC-12, RF12, DEC-12)', () => {
  it('restores the named file byte for byte and keeps the invalid copy in the run directory', async () => {
    await writeFile(planPath, VALID_PLAN, 'utf8');
    await writeFile(checkpointPath, VALID_CHECKPOINT, 'utf8');
    await store.snapshotState('run-a');
    await writeFile(planPath, CORRUPT, 'utf8');
    await writeFile(checkpointPath, 'edited by the agent', 'utf8');
    await store.restoreState('run-a', ['plan']);
    expect(await readFile(planPath, 'utf8')).toBe(VALID_PLAN);
    expect(await readFile(checkpointPath, 'utf8')).toBe('edited by the agent');
    const invalid = (await readdir(runDirectory(projectRoot, 'run-a'))).filter((name) => name.startsWith('plan.invalid-'));
    expect(invalid).toHaveLength(1);
    expect(await readFile(join(runDirectory(projectRoot, 'run-a'), invalid[0] ?? ''), 'utf8')).toBe(CORRUPT);
  });

  it('restores a file the agent deleted without an invalid copy', async () => {
    await writeFile(checkpointPath, VALID_CHECKPOINT, 'utf8');
    await store.snapshotState('run-a');
    await rm(checkpointPath);
    await store.restoreState('run-a', ['checkpoint']);
    expect(await readFile(checkpointPath, 'utf8')).toBe(VALID_CHECKPOINT);
    expect((await readdir(runDirectory(projectRoot, 'run-a'))).some((name) => name.includes('invalid'))).toBe(false);
  });
});

describe('run state restore edge cases (TC-12, DEC-12)', () => {
  it('ignores a file the session-start snapshot also lacked', async () => {
    await writeFile(planPath, VALID_PLAN, 'utf8');
    await writeFile(checkpointPath, VALID_CHECKPOINT, 'utf8');
    await store.snapshotState('run-a');
    await rm(checkpointPath);
    await store.snapshotState('run-a');
    await writeFile(checkpointPath, CORRUPT, 'utf8');
    await store.restoreState('run-a', ['checkpoint']);
    expect(await readFile(checkpointPath, 'utf8')).toBe(CORRUPT);
  });

  it('restores through a symbolic link and keeps the link', async (ctx) => {
    const target = join(projectRoot, 'real-plan.json');
    await writeFile(target, VALID_PLAN, 'utf8');
    await requireLink(ctx, await attemptLink(target, planPath, 'file'), planPath);
    await store.snapshotState('run-a');
    await writeFile(target, CORRUPT, 'utf8');
    await store.restoreState('run-a', ['plan']);
    expect(await readFile(target, 'utf8')).toBe(VALID_PLAN);
    await expect(access(planPath)).resolves.toBeUndefined();
  });
});
