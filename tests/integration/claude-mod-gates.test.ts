import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RESTART_LOG_VERSION } from '../../src/core/contracts/restart-log.js';
import { MOD_LOG_DIR, MOD_VERSION } from '../../src/infrastructure/harnesses/claude-code/mod/mod-info.js';
import { cleanupScenes, readCodes, signalTurn, startScene } from '../fixtures/claude-mod-scene.js';

afterEach(cleanupScenes);

describe('feature switched off (FR-07)', () => {
  it('does nothing and writes no log when the configuration has no autoRestart block', async () => {
    const scene = await startScene({ autoRestart: false });
    await signalTurn(scene);
    expect(scene.state.clears).toEqual([]);
    expect(await readCodes(scene)).toEqual([]);
  });
});

describe('loaded header for doctor (FR-08, DEC-10)', () => {
  it('writes the mod and Claude Code versions with no record when the session starts', async () => {
    const scene = await startScene({});
    await scene.fire('session.start', {});
    const log: unknown = JSON.parse(await readFile(join(scene.root, MOD_LOG_DIR, 'session-1.json'), 'utf8'));
    expect(log).toEqual({ v: RESTART_LOG_VERSION, harness: 'claude-code', componentVersion: MOD_VERSION, harnessVersion: '2.1.289', records: [] });
  });
});
