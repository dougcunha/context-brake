import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { codes, createWorld, fire, signalTurn, writeConfig } from '../helpers/pi-restart-world.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-pi-restart-')); await writeConfig(root); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Pi automatic restart (prd-14 FR-07, FR-09, DEC-21, TC-09)', () => {
  it('opens one new session seeded once on a valid signal', async () => {
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.seeds).toHaveLength(1);
    expect(world.seeds[0]).toContain('restarted automatically');
    expect(await codes(world)).toEqual(['RESTARTED']);
  });
  it('stops at the consecutive limit and resumes after a typed prompt', async () => {
    const world = createWorld(root);
    await signalTurn(world);
    await signalTurn(world);
    await signalTurn(world);
    expect(world.seeds).toHaveLength(2);
    expect((await codes(world)).at(-1)).toBe('PAUSED_LOOP_GUARD');
    await fire(world, 'input', await loadHarnessPayload('pi', 'input-interactive.json'));
    await signalTurn(world);
    expect(world.seeds).toHaveLength(3);
  });
  it('does not reset the guard for the seed prompt it sent itself', async () => {
    const world = createWorld(root);
    await signalTurn(world);
    await fire(world, 'input', await loadHarnessPayload('pi', 'input-extension.json'));
    await signalTurn(world, 0);
    expect((await codes(world)).at(-1)).toBe('SKIP_NO_PROGRESS');
  });
});

describe('Pi automatic restart stand-down and failures (prd-14 FR-09, NFR-01, NFR-05, TC-09)', () => {
  it('stands down outside the interactive terminal', async () => {
    const world = createWorld(root);
    world.mode = 'print';
    await signalTurn(world);
    expect(world.seeds).toEqual([]);
    expect(await codes(world)).toEqual(['SKIP_NON_INTERACTIVE']);
  });
  it('rolls back and reports when Pi cancels the new session', async () => {
    const world = createWorld(root);
    world.cancel = true;
    await signalTurn(world);
    await vi.waitFor(async () => { expect(await codes(world)).toEqual(['RESTARTED', 'ERROR_RESTART_REJECTED']); });
    world.cancel = false;
    await signalTurn(world);
    expect(world.seeds).toHaveLength(1);
  });
  it('does nothing with automatic restart off', async () => {
    await writeConfig(root, { autoRestart: undefined });
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.seeds).toEqual([]);
    expect(await codes(world)).toEqual([]);
  });
});
