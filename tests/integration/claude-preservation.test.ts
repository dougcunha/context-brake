import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';

const SETTINGS_FILE = '.claude/settings.json';
const USER_STOP = { matcher: '*', hooks: [{ type: 'command', command: 'node notify-Stop.js' }] };
const OWNED_STOP = { matcher: '*', hooks: [{ type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs', 'Stop'] }] };

describe('T06: Claude Stop registration preserves user hooks (TC-26, DEC-12)', () => {
  let tempDir: string;
  const adapter = new ClaudeAdapter();
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-it01-stop-'));
    await mkdir(join(tempDir, '.claude'), { recursive: true });
  });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

  it('adds one ContextBrake group after the user Stop group and removes only its own entry', async () => {
    const settingsPath = join(tempDir, SETTINGS_FILE);
    const original = JSON.stringify({ hooks: { Stop: [USER_STOP] } });
    await writeFile(settingsPath, original, 'utf8');
    const installed = (await adapter.planInstall({ projectRoot: tempDir })).changes.find((c) => c.path === SETTINGS_FILE)!.content!;
    expect((JSON.parse(installed) as { hooks: { Stop: unknown[] } }).hooks.Stop).toEqual([USER_STOP, OWNED_STOP]);
    await writeFile(settingsPath, installed, 'utf8');
    const removePlan = await adapter.planRemove({ projectRoot: tempDir });
    expect(removePlan.changes.find((c) => c.path === SETTINGS_FILE)?.content).toBe(original);
  });
});
