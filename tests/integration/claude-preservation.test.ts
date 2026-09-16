import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';

const SETTINGS_FILE = '.claude/settings.json';

describe('IT-01: Claude project installation preserves settings (CA-01, CA-05)', () => {
  let tempDir: string;
  const adapter = new ClaudeAdapter();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-it01-'));
    await mkdir(join(tempDir, '.claude'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('preserves existing user settings while adding ContextBrake integration', async () => {
    const fixturePath = join(__dirname, '../fixtures/harnesses/claude-code/user-settings.json');
    const original = await readFile(fixturePath, 'utf8');
    const settingsPath = join(tempDir, SETTINGS_FILE);
    await writeFile(settingsPath, original, 'utf8');
    const plan = await adapter.planInstall({ projectRoot: tempDir });
    expect(plan.conflicts).toHaveLength(0);
    const configChange = plan.changes.find((c) => c.path === SETTINGS_FILE);
    expect(configChange?.content).toContain('echo \'user pre hook\'');
    expect(configChange?.content).toContain('.claude/hooks/context-brake.mjs');
    await writeFile(settingsPath, configChange?.content ?? '', 'utf8');
    const secondPlan = await adapter.planInstall({ projectRoot: tempDir });
    const secondChange = secondPlan.changes.find((c) => c.path === SETTINGS_FILE);
    const parsed = JSON.parse(secondChange?.content ?? '{}') as { hooks?: { PreToolUse?: unknown[] } };
    expect(parsed.hooks?.PreToolUse).toHaveLength(2);
  });
});

describe('T06: Claude Stop registration preserves user hooks (TC-26, DEC-12)', () => {
  let tempDir: string;
  const adapter = new ClaudeAdapter();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-it01-stop-'));
    await mkdir(join(tempDir, '.claude'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('adds one ContextBrake group and removes only its own entry', async () => {
    const settingsPath = join(tempDir, SETTINGS_FILE);
    const userStop = { matcher: '*', hooks: [{ type: 'command', command: 'node user-stop.js' }] };
    await writeFile(settingsPath, JSON.stringify({ hooks: { Stop: [userStop] } }), 'utf8');
    const plan = await adapter.planInstall({ projectRoot: tempDir });
    const installed = JSON.parse(plan.changes.find((c) => c.path === SETTINGS_FILE)?.content ?? '{}') as { hooks: { Stop: unknown[] } };
    expect(installed.hooks.Stop).toHaveLength(2);
    expect(JSON.stringify(installed.hooks.Stop[0])).toContain('user-stop.js');
    await writeFile(settingsPath, JSON.stringify(installed), 'utf8');
    const removePlan = await adapter.planRemove({ projectRoot: tempDir });
    await writeFile(settingsPath, removePlan.changes.find((c) => c.path === SETTINGS_FILE)?.content ?? '{}', 'utf8');
    const removed = JSON.parse(await readFile(settingsPath, 'utf8')) as { hooks: { Stop: unknown[] } };
    expect(removed.hooks.Stop).toHaveLength(1);
    expect(JSON.stringify(removed.hooks.Stop[0])).toContain('user-stop.js');
  });
});
