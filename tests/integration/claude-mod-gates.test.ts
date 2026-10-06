import { afterEach, describe, expect, it } from 'vitest';
import { seedText } from '../../src/core/services/auto-restart-notices.js';
import { cleanupScenes, readCodes, settleClear, signalTurn, startScene, type CheckpointKind } from '../fixtures/claude-mod-scene.js';

afterEach(cleanupScenes);

describe('checkpoint gate in full mode (FR-03, DEC-05, TC-12)', () => {
  it.each([
    ['missing', 'SKIP_CHECKPOINT_MISSING'],
    ['invalid', 'SKIP_CHECKPOINT_INVALID'],
    ['stale', 'SKIP_CHECKPOINT_STALE'],
  ] as const)('refuses a %s checkpoint with %s and one visible notice', async (kind: CheckpointKind, code) => {
    const scene = await startScene({ mode: 'full', checkpoint: kind });
    await signalTurn(scene);
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual([code]);
    expect(scene.state.logs).toHaveLength(1);
  });

  it('refuses a checkpoint without an active step when a plan exists', async () => {
    const scene = await startScene({ mode: 'full', checkpoint: 'no-step', plan: true });
    await signalTurn(scene);
    expect(await readCodes(scene)).toEqual(['SKIP_NO_ACTIVE_STEP']);
  });

  it('restarts with a fresh valid checkpoint, with or without a plan', async () => {
    for (const plan of [true, false]) {
      const scene = await startScene({ mode: 'full', plan });
      await signalTurn(scene);
      expect(scene.state.clears).toEqual(['clear']);
    }
  });
});

describe('light mode reads no state file (FR-02, FR-03, DEC-14, TC-28)', () => {
  it('restarts on the signal without touching the plan or the checkpoint', async () => {
    const scene = await startScene({ mode: 'light', checkpoint: 'invalid', plan: true });
    await signalTurn(scene);
    expect(scene.state.clears).toEqual(['clear']);
    expect(scene.state.accessed.filter((path) => /task_plan|state_checkpoint/.test(path))).toEqual([]);
  });

  it('seeds with the generic text that does not mention the boot', async () => {
    const scene = await startScene({ mode: 'light', checkpoint: 'missing' });
    await signalTurn(scene);
    await settleClear(scene);
    expect(scene.state.seeds).toEqual([seedText('signal-only')]);
  });
});

describe('feature switched off (FR-07)', () => {
  it('does nothing and writes no log when the configuration has no autoRestart block', async () => {
    const scene = await startScene({ mode: 'full', autoRestart: false });
    await signalTurn(scene);
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual([]);
  });
});
