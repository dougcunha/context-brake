import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyEnvironment } from '../helpers/environment-overrides.js';
import { createStatuslineWorld, INSTALL, removeStatuslineWorld, runJson, STATE_PATH, type StatuslineWorld } from '../helpers/statusline-world.js';

let world: StatuslineWorld;
let configDirectory: string;
let restoreEnvironment: () => void;

function settingsWith(command: string): string {
  return JSON.stringify({ statusLine: { type: 'command', command } });
}

async function recordedPreviousCommand(): Promise<unknown> {
  const state = JSON.parse(await readFile(join(world.root, STATE_PATH), 'utf8')) as { previousCommand: unknown };
  return state.previousCommand;
}

beforeEach(async () => {
  world = await createStatuslineWorld();
  configDirectory = await mkdtemp(join(tmpdir(), 'cb-config-dir-'));
  await writeFile(join(configDirectory, 'settings.json'), settingsWith('personal.sh'), 'utf8');
  await mkdir(join(world.home, '.claude'), { recursive: true });
  await writeFile(join(world.home, '.claude', 'settings.json'), settingsWith('default-home.sh'), 'utf8');
  restoreEnvironment = applyEnvironment({ CLAUDE_CONFIG_DIR: configDirectory });
});

afterEach(async () => {
  restoreEnvironment();
  await rm(configDirectory, { recursive: true, force: true });
  await removeStatuslineWorld(world);
});

describe('status line bridge with a custom Claude Code config directory', () => {
  it('wraps the status line from CLAUDE_CONFIG_DIR instead of ~/.claude', async () => {
    await runJson(world, INSTALL, null);
    expect(await recordedPreviousCommand()).toBe('personal.sh');
  });

  it('lets an injected user home win over the environment', async () => {
    await runJson(world, INSTALL);
    expect(await recordedPreviousCommand()).toBe('default-home.sh');
  });
});
