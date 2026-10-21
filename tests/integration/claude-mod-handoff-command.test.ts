import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { IDLE_GUARD_STATE } from '../../src/core/contracts/restart-host.js';
import { renderRestartNotice } from '../../src/core/services/auto-restart-notices.js';
import { HANDOFF_ACCEPTED_LINE, HANDOFF_OFF_LINE, HANDOFF_UNAVAILABLE_LINE } from '../../src/core/services/manual-handoff.js';
import { HANDOFF_COMMAND } from '../../src/infrastructure/harnesses/claude-code/mod/handoff-command.js';
import { readGuard, readLogText, runHandoff, setGuard, startSession } from '../fixtures/claude-mod-command.js';
import { cleanupScenes, readCodes, startScene, type Scene } from '../fixtures/claude-mod-scene.js';

const PROMPT = 'ContextBrake: the user typed /handoff to continue this work in a new session. Do this now: run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET].';
const BUSY = { consecutive: 2, toolCallsSinceSeed: 0 };

afterEach(cleanupScenes);

describe('/handoff registration (FR-01, FR-11, DEC-03, DEC-04, TC-07, TC-08)', () => {
  it.each([true, false])('registers the exact spec, without immediate, with autoRestart=%s', async (autoRestart) => {
    const scene = await startScene({ autoRestart });
    await startSession(scene);
    expect(scene.state.registered).toEqual([{ name: 'handoff', description: 'Save the session state and restart in a new session', argumentHint: '[focus]' }]);
    expect(HANDOFF_COMMAND).not.toHaveProperty('immediate');
  });
  it('prints one line and keeps the session start work when the registration is refused', async () => {
    const scene = await startScene({});
    scene.state.registerFailure = true;
    await expect(startSession(scene)).resolves.toBeUndefined();
    expect(scene.state.logs).toEqual([HANDOFF_UNAVAILABLE_LINE]);
    expect(await readLogText(scene)).toContain('"componentVersion"');
  });
});

describe('/handoff with every check passed (FR-03, FR-10, A-03, TC-09)', () => {
  it('answers one line, resets the counter, and submits one prompt without a clear or a file', async () => {
    const scene = await startScene({ max: 3 });
    setGuard(scene, BUSY);
    expect(await runHandoff(scene)).toEqual({ text: HANDOFF_ACCEPTED_LINE });
    expect(scene.state.seeds).toEqual([PROMPT]);
    expect(readGuard(scene)).toEqual(IDLE_GUARD_STATE);
    expect(scene.state.clears).toEqual([]);
    expect(scene.state.accessed.some((path) => path.endsWith('handoff.md'))).toBe(false);
  });
});

describe('/handoff submits after its hook returns (qa_02 BUG-01, DEC-06)', () => {
  it('sends the prompt from a timer, which the host accepts, and logs no error', async () => {
    const scene = await startScene({});
    await runHandoff(scene);
    expect(scene.state.ticks).toBe(1);
    expect(scene.state.seeds).toEqual([PROMPT]);
    expect(await readCodes(scene)).toEqual([]);
  });
});

async function expectNoSubmit(scene: Scene): Promise<void> {
  expect(scene.state.seeds).toEqual([]);
  expect(readGuard(scene)).toEqual(BUSY);
}

describe('/handoff refusals (FR-05, FR-06, FR-10, A-04, TC-10, TC-11)', () => {
  it('names the init command without automatic restart', async () => {
    const scene = await startScene({ autoRestart: false });
    setGuard(scene, BUSY);
    expect(await runHandoff(scene)).toEqual({ text: HANDOFF_OFF_LINE });
    await expectNoSubmit(scene);
  });
  it('names the init command when the configuration does not parse', async () => {
    const scene = await startScene({});
    setGuard(scene, BUSY);
    await writeFile(join(scene.root, 'context-brake.config.json'), '{ not json', 'utf8');
    expect(await runHandoff(scene)).toEqual({ text: HANDOFF_OFF_LINE });
    await expectNoSubmit(scene);
  });
  it.each([
    ['CONTEXT_BRAKE_AUTO_RESTART=0', (scene: Scene) => scene.state.env.set('CONTEXT_BRAKE_AUTO_RESTART', '0'), 'SKIP_DISABLED_ENV'],
    ['DISABLE_AUTO_COMPACT=1', (scene: Scene) => scene.state.env.set('DISABLE_AUTO_COMPACT', '1'), 'SKIP_DISABLED_ENV'],
    ['no interactive surface', (scene: Scene) => { scene.state.surfaces = []; }, 'SKIP_NON_INTERACTIVE'],
  ] as const)('answers the notice and logs the code once with %s', async (_, arrange, code) => {
    const scene = await startScene({});
    setGuard(scene, BUSY);
    arrange(scene);
    expect(await runHandoff(scene)).toEqual({ text: renderRestartNotice(code) });
    expect(await readCodes(scene)).toEqual([code]);
    expect(scene.state.logs).toEqual([]);
    await expectNoSubmit(scene);
  });
});
