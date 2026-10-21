import { utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { renderRestartNotice, seedText } from '../../src/core/services/auto-restart-notices.js';
import { HANDOFF_ACCEPTED_LINE, HANDOFF_FAILED_LINE } from '../../src/core/services/manual-handoff.js';
import { readLogText, runHandoff, setGuard } from '../fixtures/claude-mod-command.js';
import { cleanupScenes, finishTurn, readCodes, settleClear, signalTurn, startScene, waitForCodes, type Scene } from '../fixtures/claude-mod-scene.js';

const FOCUS = 'finish the parser bug before the release';

afterEach(cleanupScenes);

async function writeHandoff(scene: Scene, ageMs: number): Promise<void> {
  const path = join(scene.root, '.context-brake', 'handoff.md');
  await writeFile(path, '# Goal\n', 'utf8');
  const at = new Date(scene.state.now - ageMs);
  if (ageMs > 0) await utimes(path, at, at);
}

describe('restart after /handoff uses the existing flow (FR-08, FR-10, TC-12, TC-14)', () => {
  it('restarts only when the prompted reply ends with the signal', async () => {
    const scene = await startScene({});
    await runHandoff(scene);
    await finishTurn(scene, 'Saved the snapshot.');
    expect(scene.state.clears).toEqual([]);
    await signalTurn(scene, 1);
    await settleClear(scene);
    expect(scene.state.clears).toEqual(['clear']);
    expect(scene.state.seeds.at(-1)).toBe(seedText());
  });
  it('restarts at the loop limit because the command reset the counter', async () => {
    const scene = await startScene({ max: 2 });
    setGuard(scene, { consecutive: 2, toolCallsSinceSeed: 0 });
    await runHandoff(scene);
    await signalTurn(scene, 1);
    expect(await readCodes(scene)).toEqual(['RESTARTED']);
  });
});

describe('handoff mode keeps its checks (FR-09, TC-13)', () => {
  it.each([
    [10_000, 'SKIP_HANDOFF_STALE'],
    [0, 'RESTARTED'],
  ] as const)('a handoff aged %i ms gives %s', async (ageMs, code) => {
    const scene = await startScene({ handoff: true });
    await runHandoff(scene);
    await writeHandoff(scene, ageMs);
    await signalTurn(scene, 1);
    expect(await readCodes(scene)).toEqual([code]);
  });
});

describe('privacy and failures (NFR-02, NFR-05, TC-15)', () => {
  it('keeps the focus and the prompt out of the restart log', async () => {
    const scene = await startScene({});
    await runHandoff(scene, FOCUS);
    expect(scene.state.seeds[0]).toContain(`"${FOCUS}"`);
    await signalTurn(scene, 1);
    const log = await readLogText(scene);
    expect(log).toContain('RESTARTED');
    expect(log).not.toContain('parser bug');
    expect(log).not.toContain('/handoff');
  });
  it('answers the failure line and logs an internal error when the store write fails', async () => {
    const scene = await startScene({});
    setGuard(scene, { consecutive: 1, toolCallsSinceSeed: 0 });
    scene.state.storeWriteFailure = true;
    expect(await runHandoff(scene)).toEqual({ text: HANDOFF_FAILED_LINE });
    expect(scene.state.seeds).toEqual([]);
    expect(await readCodes(scene)).toEqual(['ERROR_INTERNAL']);
  });
  it('logs an internal error when the prompt submit is rejected', async () => {
    const scene = await startScene({});
    scene.state.seedFailure = true;
    expect(await runHandoff(scene)).toEqual({ text: HANDOFF_ACCEPTED_LINE });
    expect(await waitForCodes(scene, 1)).toEqual(['ERROR_INTERNAL']);
    await expect.poll(() => scene.state.logs).toEqual([renderRestartNotice('ERROR_INTERNAL')]);
  });
});
