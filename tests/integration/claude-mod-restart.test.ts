import { afterEach, describe, expect, it } from 'vitest';
import { seedText } from '../../src/core/services/auto-restart-notices.js';
import { SESSION_RESET_SIGNAL } from '../../src/core/services/reset-notice.js';
import { cleanupScenes, finishTurn, readCodes, settleClear, signalTurn, startScene, waitForCodes } from '../fixtures/claude-mod-scene.js';

afterEach(cleanupScenes);

describe('clear on the restart signal (FR-01, DEC-01, DEC-02, TC-09)', () => {
  it('queues exactly one clear for a signal at the end of a turn', async () => {
    const scene = await startScene({ mode: 'full' });
    await signalTurn(scene);
    expect(scene.state.clears).toEqual(['clear']);
    expect(await readCodes(scene)).toEqual(['RESTARTED']);
  });

  it('does not clear without the signal, whatever the answer says', async () => {
    const scene = await startScene({ mode: 'full' });
    await finishTurn(scene, `Finished. ${SESSION_RESET_SIGNAL} was not requested here.\nAll done.`);
    expect(scene.state.clears).toEqual([]);
  });

  it('ignores subagent turns and turns that did not end with an answer', async () => {
    const scene = await startScene({ mode: 'full' });
    await finishTurn(scene, `x\n${SESSION_RESET_SIGNAL}`, { extra: { agentId: 'agent-1' } });
    await finishTurn(scene, `x\n${SESSION_RESET_SIGNAL}`, { extra: { reason: 'aborted', isAborted: true } });
    expect(scene.state.clears).toEqual([]);
  });
});

describe('seed after the clear (FR-02, DEC-03, TC-10, TC-11)', () => {
  it('submits the full-mode seed once, after the queued clear resolves', async () => {
    const scene = await startScene({ mode: 'full' });
    await signalTurn(scene);
    expect(scene.state.seeds).toEqual([]);
    await settleClear(scene);
    await settleClear(scene);
    expect(scene.state.seeds).toEqual([seedText('checkpoint')]);
  });

  it('submits nothing when the person types /clear themselves', async () => {
    const scene = await startScene({ mode: 'full' });
    await scene.fire('session.end', { reason: 'clear' });
    await finishTurn(scene, 'Plain answer.');
    expect(scene.state.clears).toEqual([]);
    expect(scene.state.seeds).toEqual([]);
  });
});

describe('failures never break the session (NFR-04, TC-13)', () => {
  it('logs an internal error and lets the turn go on when a read fails', async () => {
    const scene = await startScene({ mode: 'full' });
    scene.state.readFailure = true;
    await expect(signalTurn(scene)).resolves.toBeUndefined();
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual(['ERROR_INTERNAL']);
  });

  it('rolls the counter back and sends no seed when the clear is rejected', async () => {
    const scene = await startScene({ mode: 'full' });
    await signalTurn(scene);
    await settleClear(scene, 'reject');
    expect(scene.state.seeds).toEqual([]);
    expect(await readCodes(scene)).toEqual(['RESTARTED', 'ERROR_CLEAR_REJECTED']);
    expect([...scene.state.store.values()]).toEqual([{ consecutive: 0, toolCallsSinceSeed: null }]);
  });

  it('reports a rejected seed without throwing', async () => {
    const scene = await startScene({ mode: 'full' });
    scene.state.seedFailure = true;
    await signalTurn(scene);
    await settleClear(scene);
    expect(await readCodes(scene)).toEqual(['RESTARTED', 'ERROR_INTERNAL']);
  });
});

describe('a store failure after the clear still seeds the session (NFR-04, TC-13, CR-03)', () => {
  it('sends the seed and logs an internal error when the store write fails after the clear', async () => {
    const scene = await startScene({ mode: 'full' });
    await signalTurn(scene);
    scene.state.storeWriteFailure = true;
    await settleClear(scene);
    expect(scene.state.seeds).toHaveLength(1);
    expect(await waitForCodes(scene, 2)).toEqual(['RESTARTED', 'ERROR_INTERNAL']);
  });
});
