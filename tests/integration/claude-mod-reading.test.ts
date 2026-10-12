import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { contextReadingRelativePath, contextReadingSchema } from '../../src/core/contracts/context-reading.js';
import { recordDecision } from '../../src/infrastructure/harnesses/claude-code/mod/mod-log.js';
import { cleanupScenes, readCodes, startScene, type Scene } from '../fixtures/claude-mod-scene.js';

afterEach(cleanupScenes);

const READING_EVENTS = ['session.start', 'turn.start', 'tool.call', 'turn.complete'] as const;
const FULL_USAGE = { context: { tokens: 54_452, window: 1_000_000, percent: 5 } };

async function readingOf(scene: Scene): Promise<unknown> {
  const text = await readFile(join(scene.root, contextReadingRelativePath('claude-code', 'session-1')), 'utf8').catch(() => null);
  return text === null ? null : contextReadingSchema.parse(JSON.parse(text));
}

describe('mod publishes the context reading (FR-01, NFR-02, TC-01)', () => {
  it.each(READING_EVENTS)('writes the strict reading file on %s', async (event) => {
    const scene = await startScene({ autoRestart: false });
    scene.state.usage = FULL_USAGE;
    await scene.fire(event, { answer: 'done', reason: 'answer' });
    expect(await readingOf(scene)).toEqual({ v: 1, at: new Date(scene.state.now).toISOString(), windowTokens: 1_000_000, inputTokens: 54_452, usedPercentage: 5 });
  });

  it('writes again only when the tokens or the window change', async () => {
    const scene = await startScene({ autoRestart: false });
    scene.state.usage = FULL_USAGE;
    await scene.fire('tool.call', { tool: 'Bash' });
    const firstAt = new Date(scene.state.now).toISOString();
    scene.state.now += 1000;
    await scene.fire('tool.call', { tool: 'Bash' });
    expect(await readingOf(scene)).toMatchObject({ at: firstAt });
    scene.state.usage = { context: { ...FULL_USAGE.context, tokens: 54_500 } };
    await scene.fire('tool.call', { tool: 'Bash' });
    expect(await readingOf(scene)).toMatchObject({ inputTokens: 54_500, at: new Date(scene.state.now).toISOString() });
  });

  it('records missing counts as null and never as zero', async () => {
    const scene = await startScene({ autoRestart: false });
    scene.state.usage = { context: { window: 200_000 } };
    await scene.fire('turn.start', { text: 'go' });
    expect(await readingOf(scene)).toMatchObject({ windowTokens: 200_000, inputTokens: null, usedPercentage: null });
  });
});

describe('mod survives a reading it cannot take (FR-09, NFR-04, TC-02)', () => {
  it('writes nothing, throws nothing, and reports an internal error when usage() rejects', async () => {
    const scene = await startScene({ autoRestart: false });
    scene.state.usage = new Error('usage unavailable');
    await expect(scene.fire('tool.call', { tool: 'Bash' })).resolves.toEqual({ tool: 'Bash' });
    expect(await readingOf(scene)).toBeNull();
    expect(await readCodes(scene)).toEqual(['ERROR_INTERNAL']);
  });

  it('writes nothing and reports an internal error when the reading has no window', async () => {
    const scene = await startScene({ autoRestart: false });
    scene.state.usage = { context: { tokens: 10 } };
    await scene.fire('tool.call', { tool: 'Bash' });
    expect(await readingOf(scene)).toBeNull();
    expect(await readCodes(scene)).toEqual(['ERROR_INTERNAL']);
  });

  it('reports the same condition once, and again after another record follows it', async () => {
    const scene = await startScene({ autoRestart: false });
    scene.state.usage = { context: {} };
    for (let call = 0; call < 3; call += 1) await scene.fire('tool.call', { tool: 'Bash' });
    expect(await readCodes(scene)).toEqual(['ERROR_INTERNAL']);
    await recordDecision(scene.host, 'RESTARTED');
    await scene.fire('tool.call', { tool: 'Bash' });
    expect(await readCodes(scene)).toEqual(['ERROR_INTERNAL', 'RESTARTED', 'ERROR_INTERNAL']);
  });
});
