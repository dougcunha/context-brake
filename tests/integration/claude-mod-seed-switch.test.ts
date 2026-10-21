import { afterEach, describe, expect, it } from 'vitest';
import { seedText } from '../../src/core/services/auto-restart-notices.js';
import { SEED_SWITCH_LIMIT_MS, SEED_SWITCH_POLL_MS } from '../../src/infrastructure/harnesses/claude-code/mod/mod-info.js';
import { cleanupScenes, settleClear, signalTurn, startScene, waitForCodes } from '../fixtures/claude-mod-scene.js';

const POLLS_AT_CAP = SEED_SWITCH_LIMIT_MS / SEED_SWITCH_POLL_MS;

afterEach(cleanupScenes);

describe('seed after the session id switch (NFR-04, DEC-07, TC-05, TC-06)', () => {
  it('sends the seed only after the session id changes, once', async () => {
    const scene = await startScene({});
    scene.state.switchAtTick = 3;
    await signalTurn(scene, 1);
    await settleClear(scene);
    expect(scene.state.ticks).toBe(3);
    expect(scene.state.seeds).toEqual([seedText()]);
    expect(scene.state.store.get(`contextbrake:autorestart:${scene.root}`)).toEqual({ consecutive: 1, toolCallsSinceSeed: 0 });
  });

  it('sends the seed at the 3 s cap when the session id never changes', async () => {
    const scene = await startScene({});
    await signalTurn(scene);
    await settleClear(scene);
    expect(scene.state.ticks).toBe(POLLS_AT_CAP);
    expect(scene.state.seeds).toEqual([seedText()]);
  });
});

describe('seed path failures (NFR-04, NFR-05, DEC-07)', () => {
  it('still clears and seeds at the cap when the session id cannot be read', async () => {
    const scene = await startScene({});
    scene.state.idFailure = true;
    await signalTurn(scene);
    await settleClear(scene);
    expect(scene.state.clears).toEqual(['clear']);
    expect(scene.state.ticks).toBe(POLLS_AT_CAP);
    expect(scene.state.seeds).toEqual([seedText()]);
  });

  it('waits for no switch and sends no seed when the clear is rejected', async () => {
    const scene = await startScene({});
    await signalTurn(scene);
    await settleClear(scene, 'reject');
    expect(scene.state.ticks).toBe(0);
    expect(scene.state.seeds).toEqual([]);
    expect(await waitForCodes(scene, 2)).toEqual(['RESTARTED', 'ERROR_RESTART_REJECTED']);
  });
});

describe('a failed seed wait still seeds (codereview_01 CR-01, DEC-07)', () => {
  it('sends the seed at once and marks the session seeded when the timer API throws', async () => {
    const scene = await startScene({});
    scene.state.clockFailure = true;
    await signalTurn(scene, 1);
    await settleClear(scene);
    expect(scene.state.ticks).toBe(0);
    expect(scene.state.seeds).toEqual([seedText()]);
    expect(scene.state.store.get(`contextbrake:autorestart:${scene.root}`)).toEqual({ consecutive: 1, toolCallsSinceSeed: 0 });
  });

  it('waits the full cap when the ended id was unknown, even if later reads work', async () => {
    const scene = await startScene({});
    scene.state.idFailure = true;
    await signalTurn(scene);
    scene.state.idFailure = false;
    await settleClear(scene);
    expect(scene.state.ticks).toBe(POLLS_AT_CAP);
    expect(scene.state.seeds).toEqual([seedText()]);
  });

  it('rolls back and records the rejection when the clear cannot be queued', async () => {
    const scene = await startScene({});
    scene.state.commandFailure = true;
    await signalTurn(scene);
    expect(scene.state.seeds).toEqual([]);
    expect(await waitForCodes(scene, 2)).toEqual(['RESTARTED', 'ERROR_RESTART_REJECTED']);
  });
});
