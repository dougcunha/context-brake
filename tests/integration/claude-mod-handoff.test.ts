import { utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupScenes, readCodes, signalTurn, startScene, type Scene } from '../fixtures/claude-mod-scene.js';

afterEach(cleanupScenes);

async function writeHandoff(scene: Scene, ageMs: number): Promise<void> {
  const path = join(scene.root, '.context-brake', 'handoff.md');
  await writeFile(path, '# Goal\n', 'utf8');
  const at = new Date(scene.state.now - ageMs);
  if (ageMs > 0) await utimes(path, at, at);
}

describe('Claude Code mod in handoff mode (prd-14 FR-04, FR-05, TC-07)', () => {
  it('does not clear and logs the reason when no handoff was written', async () => {
    const scene = await startScene({ handoff: true });
    await signalTurn(scene);
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual(['SKIP_HANDOFF_MISSING']);
  });
  it('does not clear when the handoff predates the turn that asked for it', async () => {
    const scene = await startScene({ handoff: true });
    await writeHandoff(scene, 10_000);
    await signalTurn(scene);
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual(['SKIP_HANDOFF_STALE']);
  });
  it('clears when the handoff was written during the turn', async () => {
    const scene = await startScene({ handoff: true });
    await writeHandoff(scene, 0);
    await signalTurn(scene);
    expect(scene.state.clears).toEqual(['clear']);
    expect(await readCodes(scene)).toEqual(['RESTARTED']);
  });
});
