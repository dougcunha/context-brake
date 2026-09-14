import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';

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
    const settingsPath = join(tempDir, '.claude/settings.json');
    await writeFile(settingsPath, original, 'utf8');
    const plan = await adapter.planInstall({ projectRoot: tempDir });
    expect(plan.conflicts).toHaveLength(0);
    const configChange = plan.changes.find((c) => c.path === '.claude/settings.json');
    expect(configChange?.content).toContain('echo \'user pre hook\'');
    expect(configChange?.content).toContain('.claude/hooks/context-brake.mjs');
    await writeFile(settingsPath, configChange?.content ?? '', 'utf8');
    const secondPlan = await adapter.planInstall({ projectRoot: tempDir });
    const secondChange = secondPlan.changes.find((c) => c.path === '.claude/settings.json');
    const parsed = JSON.parse(secondChange?.content ?? '{}') as { hooks?: { PreToolUse?: unknown[] } };
    expect(parsed.hooks?.PreToolUse).toHaveLength(2);
  });
});
