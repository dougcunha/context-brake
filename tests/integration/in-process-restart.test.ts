import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { codesOf, writeConfig } from '../helpers/in-process-restart-run.js';
import { createOmpWorld, ompRun, openOmpRun } from '../helpers/omp-restart-world.js';
import { createPiWorld, openPiRun, piRun } from '../helpers/pi-restart-world.js';

const HARNESSES = [{ harness: 'oh-my-pi', open: openOmpRun }, { harness: 'pi', open: openPiRun }];
const DRAFT = 'draft the person is typing';
const REJECTED = ['RESTARTED', 'ERROR_RESTART_REJECTED'];

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-in-process-restart-')); await writeConfig(root); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('in-process restart on Pi and Oh-My-Pi (prd-14 FR-07, FR-08, FR-09, DEC-19, DEC-21, TC-09, TC-10)', () => {
  it.each(HARNESSES)('$harness records the loaded restart module when a session starts (FR-11)', async ({ open }) => {
    const run = open(root);
    await run.start();
    expect(await run.log()).toMatchObject({ componentVersion: '1.0.0', records: [] });
  });
  it.each(HARNESSES)('$harness opens one new session seeded once on a valid signal', async ({ open }) => {
    const run = open(root);
    await run.signal();
    expect(run.sessions()).toBe(1);
    expect(run.seeds()).toEqual([expect.stringContaining('restarted automatically')]);
    expect(await codesOf(run)).toEqual(['RESTARTED']);
  });
  it.each(HARNESSES)('$harness skips a turn without tool calls, stops at the consecutive limit, and resumes after a typed prompt', async ({ open }) => {
    const run = open(root);
    await run.signal();
    await run.ownPrompt();
    await run.signal(0);
    await run.signal();
    await run.signal();
    await run.type();
    await run.signal();
    expect(await codesOf(run)).toEqual(['RESTARTED', 'SKIP_NO_PROGRESS', 'RESTARTED', 'PAUSED_LOOP_GUARD', 'RESTARTED']);
    expect(run.sessions()).toBe(3);
  });
});

describe('in-process restart the harness does not carry out (prd-14 NFR-01, DEC-19, TC-09)', () => {
  it('leaves a busy Oh-My-Pi editor alone and reports the restart as not carried out', async () => {
    const world = createOmpWorld(root);
    world.editor = DRAFT;
    await ompRun(world).signal();
    expect(world.editor).toBe(DRAFT);
    await vi.waitFor(async () => { expect(await codesOf(ompRun(world))).toEqual(REJECTED); });
  });
  it('rolls the counter back and reports when Pi cancels the new session', async () => {
    await writeConfig(root, { autoRestart: { maxConsecutiveRestarts: 1 } });
    const world = createPiWorld(root);
    world.cancel = true;
    await piRun(world).signal();
    await vi.waitFor(async () => { expect(await codesOf(piRun(world))).toEqual(REJECTED); });
    world.cancel = false;
    await piRun(world).signal();
    expect(world.seeds).toHaveLength(1);
  });
});
