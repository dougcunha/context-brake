import { afterEach, describe, expect, it } from 'vitest';
import { seedText } from '../../src/core/services/auto-restart-notices.js';
import { cleanupScenes, readCodes, settleClear, signalTurn, startScene } from '../fixtures/claude-mod-scene.js';

afterEach(cleanupScenes);

describe('signal-only gate (prd-12 FR-10, TC-03)', () => {
  it('restarts on the signal with no state file', async () => {
    const scene = await startScene({});
    await signalTurn(scene);
    expect(scene.state.clears).toEqual(['clear']);
    expect(scene.state.accessed.filter((path) => /task_plan|state_checkpoint/.test(path))).toEqual([]);
  });

  it('seeds with the generic text that does not mention the boot', async () => {
    const scene = await startScene({});
    await signalTurn(scene);
    await settleClear(scene);
    expect(scene.state.seeds).toEqual([seedText()]);
  });
});

describe('feature switched off (FR-07)', () => {
  it('does nothing and writes no log when the configuration has no autoRestart block', async () => {
    const scene = await startScene({ autoRestart: false });
    await signalTurn(scene);
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual([]);
  });
});
