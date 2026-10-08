import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { HANDOFF_OFFSET_MS, writeHandoffAt } from '../helpers/handoff-file.js';
import { codes, createWorld, signalTurn, writeConfig } from '../helpers/pi-restart-world.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-pi-handoff-')); });
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('Pi restart stands down under the switch (prd-14 FR-09, DEC-16, TC-09)', () => {
  it('opens no session with CONTEXT_BRAKE_AUTO_RESTART=0', async () => {
    await writeConfig(root);
    vi.stubEnv('CONTEXT_BRAKE_AUTO_RESTART', '0');
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.seeds).toEqual([]);
    expect(await codes(world)).toEqual(['SKIP_DISABLED_ENV']);
  });
});

describe('Pi restart in handoff mode (prd-14 FR-04, DEC-04, TC-09)', () => {
  beforeEach(async () => { await writeConfig(root, { snapshot: DEFAULT_CONFIG.snapshot }); });
  it('skips without a handoff', async () => {
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.seeds).toEqual([]);
    expect(await codes(world)).toEqual(['SKIP_HANDOFF_MISSING']);
  });
  it('skips a handoff written before the turn started', async () => {
    await writeHandoffAt(root, -HANDOFF_OFFSET_MS);
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.seeds).toEqual([]);
    expect(await codes(world)).toEqual(['SKIP_HANDOFF_STALE']);
  });
  it('restarts with a handoff written during the turn', async () => {
    await writeHandoffAt(root, HANDOFF_OFFSET_MS);
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.seeds).toHaveLength(1);
    expect(await codes(world)).toEqual(['RESTARTED']);
  });
});
