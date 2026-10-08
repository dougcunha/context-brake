import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { codes, createWorld, pressEnter, signalTurn, writeConfig } from '../helpers/omp-restart-world.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-omp-restart-')); await writeConfig(root); });
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

describe('Oh-My-Pi restart with one Enter (prd-14 FR-08, FR-09, DEC-19, TC-10)', () => {
  it('prefills the command, and Enter opens a seeded session', async () => {
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.editor).toBe('/context-brake-restart');
    await pressEnter(world);
    expect(world.sessions).toBe(1);
    expect(world.sent).toHaveLength(1);
    expect(world.sent[0]).toContain('restarted automatically');
  });
  it('counts restarts confirmed with Enter toward the consecutive limit', async () => {
    const world = createWorld(root);
    for (let round = 0; round < 3; round += 1) {
      await signalTurn(world);
      if (world.editor !== '') await pressEnter(world);
    }
    expect(world.sessions).toBe(2);
    expect((await codes(world)).at(-1)).toBe('PAUSED_LOOP_GUARD');
  });
  it('leaves a busy editor alone and reports the restart as not carried out', async () => {
    const world = createWorld(root);
    world.editor = 'draft the person is typing';
    await signalTurn(world);
    expect(world.editor).toBe('draft the person is typing');
    await vi.waitFor(async () => { expect(await codes(world)).toEqual(['RESTARTED', 'ERROR_RESTART_REJECTED']); });
  });
});
