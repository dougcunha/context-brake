import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CODEX_CONFIG_FILE, planCodexInstall, planCodexRemove } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { CURSOR_CONFIG_FILE, planCursorInstall, planCursorRemove } from '../../src/infrastructure/harnesses/cursor/planner.js';

const CODEX_EVENTS = ['PreToolUse', 'PostToolUse', 'SessionStart'];
const CURSOR_EVENTS = ['preToolUse', 'postToolUse', 'sessionStart'];

function commentFor(name: string, index: number): string {
  return index % 2 === 0 ? ` // keep ${name}` : ` /* keep ${name} */`;
}

function codexDocument(): string {
  const events = CODEX_EVENTS.map((event, index) => {
    const entry = `      { "matcher": "user-${event}", "hooks": [{ "type": "command", "command": "echo ${event}" }] }${commentFor(event, index)}`;
    return `    "${event}": [\n${entry}\n    ]`;
  });
  return `{\n  "hooks": {\n${events.join(',\n')}\n  }\n}\n`;
}

function cursorDocument(): string {
  const events = CURSOR_EVENTS.map((event, index) => {
    const entry = `      { "command": "echo ${event}" }${commentFor(event, index)}`;
    return `    "${event}": [\n${entry}\n    ]`;
  });
  return `{\n  "version": 1,\n  "hooks": {\n${events.join(',\n')}\n  }\n}\n`;
}

async function step(fn: () => Promise<{ changes: readonly { path: string; content: string | null }[] }>, file: string): Promise<string> {
  const plan = await fn();
  const change = plan.changes.find((c) => c.path === file);
  if (change?.content) await writeFile(file, change.content, 'utf8');
  return readFile(file, 'utf8');
}

function expectCodexComments(content: string): void {
  expect(content).toContain('// keep PreToolUse');
  expect(content).toContain('/* keep PostToolUse */');
  expect(content).toContain('// keep SessionStart');
}

function expectCursorComments(content: string): void {
  expect(content).toContain('// keep preToolUse');
  expect(content).toContain('/* keep postToolUse */');
  expect(content).toContain('// keep sessionStart');
}

describe('Codex CLI user hook preservation (RF6, CA-05, RF19, CA-12, T29.3)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-codex-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('preserves all three event hooks and trailing comments byte-exactly', async () => {
    const initial = codexDocument();
    const file = join(root, CODEX_CONFIG_FILE);
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(file, initial, 'utf8');

    const first = await step(() => planCodexInstall(root), file);
    const second = await step(() => planCodexInstall(root), file);
    const third = await step(() => planCodexInstall(root), file);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expectCodexComments(first);

    const removed = await step(() => planCodexRemove(root), file);
    expect(removed).toBe(initial);
  });
});

describe('Cursor user hook preservation (RF6, CA-05, RF19, CA-12, T29.3)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-cursor-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('preserves all three event hooks and trailing comments byte-exactly', async () => {
    const initial = cursorDocument();
    const file = join(root, CURSOR_CONFIG_FILE);
    await mkdir(join(root, '.cursor'), { recursive: true });
    await writeFile(file, initial, 'utf8');

    const first = await step(() => planCursorInstall(root), file);
    const second = await step(() => planCursorInstall(root), file);
    const third = await step(() => planCursorInstall(root), file);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expectCursorComments(first);

    const removed = await step(() => planCursorRemove(root), file);
    expect(removed).toBe(initial);
  });
});
