import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planInit } from '../../src/cli/init-plan.js';
import type { ChangePlan } from '../../src/core/contracts/changes.js';
import { BRIDGE_PATH, createStatuslineWorld, INSTALL, LOCAL_PATH, localStatusline, removeStatuslineWorld, runJson, STATE_PATH, type StatuslineWorld } from '../helpers/statusline-world.js';
import { runnerReporting } from '../helpers/claude-version-runner.js';
import { fakeOverheadMeasurer } from '../helpers/fake-overhead-measurer.js';

const MANIFEST_PATH = '.context-brake/manifest.json';
const USER_STATUSLINE = { type: 'command', command: 'personal.sh' };
const OLD_CLAUDE = runnerReporting('2.1.100');
const MOD_CLAUDE = runnerReporting('2.1.296');
let world: StatuslineWorld;

async function makeBridgeInactive(): Promise<void> {
  await writeFile(join(world.root, LOCAL_PATH), `${JSON.stringify({ statusLine: USER_STATUSLINE }, null, 2)}\n`, 'utf8');
}

function plannedLocalStatusline(plan: ChangePlan): unknown {
  const change = plan.changes.find((item) => item.path === LOCAL_PATH);
  return change === undefined ? USER_STATUSLINE : localStatusline(change.content ?? null);
}

beforeEach(async () => { world = await createStatuslineWorld(); });
afterEach(async () => { await removeStatuslineWorld(world); });

describe('status line request keep (DEC-05, TC-07)', () => {
  it.each([['bridge source', OLD_CLAUDE], ['mod source', MOD_CLAUDE]])('plans no status line change on the %s', async (_source, runner) => {
    await runJson(world, INSTALL, { runner: OLD_CLAUDE });
    await makeBridgeInactive();
    const env = { projectRoot: world.root, userHome: world.home, runner, overheadMeasurer: fakeOverheadMeasurer };
    const { result } = await planInit(env, { harness: [], excludeHarness: [], statuslineBridge: 'keep', noAutoRestart: false });
    const paths = result.plan.changes.map((change) => change.path);
    expect(paths).not.toContain(STATE_PATH);
    expect(paths).not.toContain(BRIDGE_PATH);
    expect(result.plan.changes.find((change) => change.path === MANIFEST_PATH)?.content ?? BRIDGE_PATH).toContain(BRIDGE_PATH);
    expect(plannedLocalStatusline(result.plan)).toEqual(USER_STATUSLINE);
  });

  it('reinstalls the bridge over the user status line with the default request', async () => {
    await runJson(world, INSTALL, { runner: OLD_CLAUDE });
    await makeBridgeInactive();
    const env = { projectRoot: world.root, userHome: world.home, runner: OLD_CLAUDE, overheadMeasurer: fakeOverheadMeasurer };
    const { result } = await planInit(env, { harness: [], excludeHarness: [], statuslineBridge: 'default', noAutoRestart: false });
    expect(result.plan.changes.map((change) => change.path)).toContain(STATE_PATH);
  });
});
