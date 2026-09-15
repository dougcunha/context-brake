import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODEX_CONFIG_FILE, planCodexInstall, planCodexRemove } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { CURSOR_CONFIG_FILE, planCursorInstall, planCursorRemove } from '../../src/infrastructure/harnesses/cursor/planner.js';

async function step(fn: () => Promise<{ changes: Array<{ path: string; content: string | null }> }>, file: string): Promise<string> {
  const plan = await fn();
  const change = plan.changes.find((c) => c.path === file);
  if (change?.content) await writeFile(file, change.content, 'utf8');
  return readFile(file, 'utf8');
}

describe('Codex CLI user hook preservation (RF6, CA-05, RF19, CA-12)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-codex-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('preserves user hooks and inline comments across installs and removal', async () => {
    const initial = '{\n  // User\n  "hooks": {\n    "PreToolUse": [\n      { "matcher": "m", "hooks": [{ "type": "command", "command": "echo user" /* note */ }] }\n    ]\n  }\n}\n';
    const file = join(root, CODEX_CONFIG_FILE);
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(file, initial, 'utf8');

    const s1 = await step(() => planCodexInstall(root), file);
    expect(s1).toContain('// User');
    expect(s1).toContain('/* note */');
    const s2 = await step(() => planCodexInstall(root), file);
    expect(s2).toBe(s1);
    const s3 = await step(() => planCodexInstall(root), file);
    expect(s3).toBe(s1);
    const s4 = await step(() => planCodexRemove(root), file);
    expect(s4).toContain('// User');
    expect(s4).toContain('/* note */');
    expect(s4).not.toContain('context-brake.mjs');
  });
});

describe('Cursor user hook preservation (RF6, CA-05, RF19, CA-12)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-cursor-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('preserves user hooks and comments across installs and removal', async () => {
    const initial = '{\n  "version": 1,\n  // User\n  "hooks": {\n    "preToolUse": [\n      { "command": "echo user" /* note */ }\n    ]\n  }\n}\n';
    const file = join(root, CURSOR_CONFIG_FILE);
    await mkdir(join(root, '.cursor'), { recursive: true });
    await writeFile(file, initial, 'utf8');

    const s1 = await step(() => planCursorInstall(root), file);
    expect(s1).toContain('// User');
    expect(s1).toContain('/* note */');
    const s2 = await step(() => planCursorInstall(root), file);
    expect(s2).toBe(s1);
    const s3 = await step(() => planCursorInstall(root), file);
    expect(s3).toBe(s1);
    const s4 = await step(() => planCursorRemove(root), file);
    expect(s4).toContain('// User');
    expect(s4).toContain('/* note */');
    expect(s4).not.toContain('context-brake.mjs');
  });
});
