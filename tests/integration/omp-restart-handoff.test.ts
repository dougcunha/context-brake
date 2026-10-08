import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { HANDOFF_OFFSET_MS, writeHandoffAt } from '../helpers/handoff-file.js';
import { codes, createWorld, pressEnter, signalTurn, writeConfig } from '../helpers/omp-restart-world.js';

let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-omp-handoff-')); });
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe('Oh-My-Pi restart stands down under the switch (prd-14 FR-09, DEC-16, TC-10)', () => {
  it('leaves the editor empty with CONTEXT_BRAKE_AUTO_RESTART=0', async () => {
    await writeConfig(root);
    vi.stubEnv('CONTEXT_BRAKE_AUTO_RESTART', '0');
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.editor).toBe('');
    expect(await codes(world)).toEqual(['SKIP_DISABLED_ENV']);
  });
});

describe('Oh-My-Pi restart in handoff mode (prd-14 FR-04, DEC-04, DEC-19, TC-10)', () => {
  beforeEach(async () => { await writeConfig(root, { snapshot: DEFAULT_CONFIG.snapshot }); });
  it('skips without a handoff', async () => {
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.editor).toBe('');
    expect(await codes(world)).toEqual(['SKIP_HANDOFF_MISSING']);
  });
  it('skips a handoff written before the turn started', async () => {
    await writeHandoffAt(root, -HANDOFF_OFFSET_MS);
    const world = createWorld(root);
    await signalTurn(world);
    expect(world.editor).toBe('');
    expect(await codes(world)).toEqual(['SKIP_HANDOFF_STALE']);
  });
  it('prefills the command with a handoff written during the turn, and Enter opens a seeded session', async () => {
    await writeHandoffAt(root, HANDOFF_OFFSET_MS);
    const world = createWorld(root);
    await signalTurn(world);
    await pressEnter(world);
    expect(world.sessions).toBe(1);
    expect(world.sent).toHaveLength(1);
  });
});
