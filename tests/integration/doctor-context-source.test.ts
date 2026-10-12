import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contextReadingRelativePath } from '../../src/core/contracts/context-reading.js';
import { readClaudeContextWindow } from '../../src/infrastructure/harnesses/claude-code/statusline-context-window.js';
import { runnerReporting } from '../helpers/claude-version-runner.js';
import { createStatuslineWorld, removeStatuslineWorld, runJson, type StatuslineWorld } from '../helpers/statusline-world.js';

const READING = { v: 1, at: '2026-10-11T10:00:00.000Z', windowTokens: 1_000_000, inputTokens: 54_452, usedPercentage: 5 };
let world: StatuslineWorld;

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

async function writeReading(sessionId: string, content: string): Promise<void> {
  const path = join(world.root, contextReadingRelativePath('claude-code', sessionId));
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, content, 'utf8');
}

describe('context window report with the mod (FR-07, TC-09)', () => {
  it('reports nothing for a repository without the mod, the bridge, or a reading', async () => {
    expect(await readClaudeContextWindow(world.root)).toEqual({ bridge: 'absent', mod: 'absent', source: 'contextWindowCeiling', lastWindowTokens: null });
  });

  it('reports an installed mod that has not reported yet', async () => {
    await runJson(world, ['init', '--yes', '--json'], { runner: runnerReporting('2.1.296') });
    expect(await readClaudeContextWindow(world.root)).toEqual({ bridge: 'absent', mod: 'installed', source: 'contextWindowCeiling', lastWindowTokens: null });
  });

  it('reports the window of the newest valid reading and ignores an invalid file', async () => {
    await writeReading('older', JSON.stringify({ ...READING, windowTokens: 200_000 }));
    await writeReading('newer', JSON.stringify(READING));
    await writeReading('broken', '{"v":1');
    expect(await readClaudeContextWindow(world.root)).toMatchObject({ mod: 'reporting', source: 'mod', lastWindowTokens: 1_000_000 });
  });
});
