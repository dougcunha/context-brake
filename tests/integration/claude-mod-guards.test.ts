import { afterEach, describe, expect, it } from 'vitest';
import { cleanupScenes, readCodes, settleClear, signalTurn, startScene, type Scene } from '../fixtures/claude-mod-scene.js';

afterEach(cleanupScenes);

async function restartAndSeed(scene: Scene, tools: number): Promise<void> {
  await signalTurn(scene, tools);
  await settleClear(scene);
}

describe('loop guard (FR-04, DEC-06, TC-04)', () => {
  it('refuses the third consecutive restart and resumes after a typed prompt', async () => {
    const scene = await startScene({ mode: 'light', max: 2 });
    await restartAndSeed(scene, 0);
    await restartAndSeed(scene, 1);
    await signalTurn(scene, 1);
    expect(scene.state.clears).toHaveLength(2);
    expect((await readCodes(scene)).at(-1)).toBe('PAUSED_LOOP_GUARD');
    await scene.fire('prompt.submit', { origin: { kind: 'composer' } });
    await restartAndSeed(scene, 1);
    expect(scene.state.clears).toHaveLength(3);
  });

  it('does not reset the counter for the seed prompt itself', async () => {
    const scene = await startScene({ mode: 'light', max: 1 });
    await restartAndSeed(scene, 0);
    await scene.fire('prompt.submit', { origin: { kind: 'plugin', name: 'context-brake-restart' } });
    await signalTurn(scene, 1);
    expect(scene.state.clears).toHaveLength(1);
  });
});

describe('no-progress guard (FR-05, TC-05)', () => {
  it('refuses a signal from a seeded session that made no tool call', async () => {
    const scene = await startScene({ mode: 'light' });
    await restartAndSeed(scene, 0);
    await signalTurn(scene, 0);
    expect(scene.state.clears).toHaveLength(1);
    expect((await readCodes(scene)).at(-1)).toBe('SKIP_NO_PROGRESS');
  });

  it('accepts the signal once a tool call happened after the seed', async () => {
    const scene = await startScene({ mode: 'light' });
    await restartAndSeed(scene, 0);
    await signalTurn(scene, 2);
    expect(scene.state.clears).toHaveLength(2);
  });
});

describe('stand-down conditions (FR-06, TC-06)', () => {
  it.each([
    ['CONTEXT_BRAKE_AUTO_RESTART', '0', 'SKIP_DISABLED_ENV'],
    ['DISABLE_AUTO_COMPACT', '1', 'SKIP_DISABLED_ENV'],
    ['CONTEXT_BRAKE_RUN_ID', 'run-1', 'SKIP_RUNNER_SESSION'],
  ] as const)('stands down when %s is %s', async (name, value, code) => {
    const scene = await startScene({ mode: 'light' });
    scene.state.env.set(name, value);
    await signalTurn(scene);
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual([code]);
  });

  it('stands down without a terminal or desktop surface', async () => {
    const scene = await startScene({ mode: 'light' });
    scene.state.surfaces = ['vscode'];
    await signalTurn(scene);
    expect(await readCodes(scene)).toEqual(['SKIP_NON_INTERACTIVE']);
  });
});
