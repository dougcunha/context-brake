import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODEX_CONFIG_FILE, planCodexInstall, planCodexRemove } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { CURSOR_CONFIG_FILE, planCursorInstall } from '../../src/infrastructure/harnesses/cursor/planner.js';

describe('Legacy entries and CRLF formatting (CR-01)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-legacy-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('replaces legacy entries with current entries and preserves CRLF', async () => {
    const codex = join(root, CODEX_CONFIG_FILE);
    await mkdir(join(root, '.codex'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/codex-cli/legacy-hooks.json', codex);
    const p1 = await planCodexInstall(root);
    expect(p1.changes.find((c) => c.path === CODEX_CONFIG_FILE)?.content).toContain('$(git rev-parse --show-toplevel)');

    const cursor = join(root, CURSOR_CONFIG_FILE);
    await mkdir(join(root, '.cursor'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/cursor/legacy-hooks.json', cursor);
    const p2 = await planCursorInstall(root);
    expect(p2.changes.find((c) => c.path === CURSOR_CONFIG_FILE)?.content).toContain('"failClosed": true');

    const crlf = '{\r\n  "version": 1,\r\n  "hooks": {}\r\n}\r\n';
    await writeFile(cursor, crlf, 'utf8');
    const p3 = await planCursorInstall(root);
    expect(p3.changes.find((c) => c.path === CURSOR_CONFIG_FILE)?.content).toContain('\r\n');
  });
});

describe('Mixed Codex groups (CR-01)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-mixed-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('preserves user handler in mixed Codex group on install and remove', async () => {
    const file = join(root, CODEX_CONFIG_FILE);
    await mkdir(join(root, '.codex'), { recursive: true });
    const mixed = '{\n  "hooks": {\n    "PreToolUse": [\n      {\n        "matcher": "*",\n        "hooks": [\n          { "type": "command", "command": "echo user" },\n          { "type": "command", "command": "node .codex/hooks/context-brake.mjs PreToolUse" }\n        ]\n      }\n    ]\n  }\n}\n';
    await writeFile(file, mixed, 'utf8');

    const p1 = await planCodexInstall(root);
    await writeFile(file, p1.changes.find((c) => c.path === CODEX_CONFIG_FILE)!.content!, 'utf8');
    expect(await readFile(file, 'utf8')).toContain('echo user');

    const p2 = await planCodexRemove(root);
    await writeFile(file, p2.changes.find((c) => c.path === CODEX_CONFIG_FILE)!.content!, 'utf8');
    const after = await readFile(file, 'utf8');
    expect(after).toContain('echo user');
    expect(after).not.toContain('context-brake.mjs');
  });
});

describe('User hook fixture preservation (CR-01)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-fixtures-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('preserves probe P1 and P2 user hook fixtures', async () => {
    const codex = join(root, CODEX_CONFIG_FILE);
    await mkdir(join(root, '.codex'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/codex-cli/user-hooks.json', codex);
    const p1 = await planCodexInstall(root);
    expect(p1.changes.find((c) => c.path === CODEX_CONFIG_FILE)?.content).toContain('echo \'user patch hook\'');

    const cursor = join(root, CURSOR_CONFIG_FILE);
    await mkdir(join(root, '.cursor'), { recursive: true });
    await copyFile('tests/fixtures/harnesses/cursor/user-hooks.json', cursor);
    const p2 = await planCursorInstall(root);
    expect(p2.changes.find((c) => c.path === CURSOR_CONFIG_FILE)?.content).toContain('echo \'user pre-tool hook\'');
  });
});
