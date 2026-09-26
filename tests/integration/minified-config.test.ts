import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AdapterPlan } from '../../src/core/contracts/adapter.js';
import { planAntigravityInstall } from '../../src/infrastructure/harnesses/antigravity-cli/planner.js';
import { planClaudeInstall } from '../../src/infrastructure/harnesses/claude-code/planner.js';
import { planCodexInstall } from '../../src/infrastructure/harnesses/codex-cli/planner.js';
import { planCursorInstall } from '../../src/infrastructure/harnesses/cursor/planner.js';

type Planner = (root: string) => Promise<AdapterPlan>;
type Fixture = { configPath: string; harness: string; file: string; planner: Planner };

async function withMinified(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'cb-min-'));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

async function writeConfig(dir: string, configPath: string, content: string): Promise<void> {
  const target = join(dir, configPath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

async function fixtureText(harness: string, file: string): Promise<string> {
  return readFile(join(__dirname, '../fixtures/harnesses', harness, file), 'utf8');
}

async function planMinified(dir: string, fixture: Fixture): Promise<Record<string, unknown>> {
  await writeConfig(dir, fixture.configPath, await fixtureText(fixture.harness, fixture.file));
  const plan = await fixture.planner(dir);
  expect(plan.conflicts).toHaveLength(0);
  const change = plan.changes.find((c) => c.path === fixture.configPath);
  expect(change?.content).toBeTruthy();
  return JSON.parse(change?.content ?? '') as Record<string, unknown>;
}

function hooksOf(parsed: Record<string, unknown>): Record<string, unknown> {
  return parsed.hooks as Record<string, unknown>;
}

describe('minified JSON config editing (CR-01, RF6, file-changes.md)', () => {
  it('keeps a minified Claude settings document valid and preserves user hooks', async () => {
    await withMinified(async (dir) => {
      const parsed = await planMinified(dir, { configPath: '.claude/settings.json', harness: 'claude-code', file: 'minified-settings.json', planner: (root) => planClaudeInstall({ projectRoot: root }) });
      expect(hooksOf(parsed).UserHook).toBe('node custom.js');
      expect(hooksOf(parsed).PreToolUse).toBeDefined();
    });
  });

  it('keeps a minified Cursor hooks document valid and preserves user hooks', async () => {
    await withMinified(async (dir) => {
      const parsed = await planMinified(dir, { configPath: '.cursor/hooks.json', harness: 'cursor', file: 'minified-hooks.json', planner: planCursorInstall });
      expect(hooksOf(parsed).preToolUse).toBeDefined();
      expect(hooksOf(parsed).postToolUse).toBeDefined();
    });
  });

  it('keeps a minified Codex hooks document valid and preserves user hooks', async () => {
    await withMinified(async (dir) => {
      const parsed = await planMinified(dir, { configPath: '.codex/hooks.json', harness: 'codex-cli', file: 'minified-hooks.json', planner: planCodexInstall });
      expect(hooksOf(parsed).PreToolUse).toBeDefined();
      expect(hooksOf(parsed).SessionStart).toBeDefined();
    });
  });
});

describe('minified JSON config failures (CR-01, RF7)', () => {
  it('keeps a minified Antigravity hooks document valid and preserves user hooks', async () => {
    await withMinified(async (dir) => {
      const parsed = await planMinified(dir, { configPath: '.agents/hooks.json', harness: 'antigravity-cli', file: 'minified-hooks.json', planner: planAntigravityInstall });
      const cb = parsed['context-brake'] as Record<string, unknown> | undefined;
      expect(cb?.PreInvocation).toBeDefined();
      expect(parsed['user-hook']).toBeDefined();
    });
  });

  it('isolates a malformed minified document as a conflict', async () => {
    await withMinified(async (dir) => {
      await writeConfig(dir, '.claude/settings.json', '{"hooks":');
      const plan = await planClaudeInstall({ projectRoot: dir });
      expect(plan.conflicts[0]?.code).toBe('INVALID_HARNESS_CONFIG');
      expect(plan.changes.find((c) => c.path === '.claude/settings.json')).toBeUndefined();
    });
  });
});
