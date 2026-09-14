import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

type HookConfig = { hooks: Record<string, unknown> };

const CLAUDE_SETTINGS = '.claude/settings.json';
const LEGACY_CLAUDE_SETTINGS = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/context-brake.mjs PreToolUse' }] }] } };

async function planConfig(harness: HarnessId, root: string, configPath: string): Promise<HookConfig> {
  const plan = await getAdapter(harness).planInstall({ projectRoot: root });
  const change = plan.changes.find((candidate) => candidate.path === configPath);
  return JSON.parse(change?.content ?? '{}') as HookConfig;
}

describe('Claude Code hook commands do not depend on the session directory (RF5)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-claude-path-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('registers the hook in exec form from the project directory placeholder', async () => {
    const config = await planConfig('claude-code', root, CLAUDE_SETTINGS);
    const entry = { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs', 'PreToolUse'] };
    expect(config.hooks.PreToolUse).toEqual([{ matcher: '*', hooks: [entry] }]);
  });

  it('replaces the relative command left by an earlier install and diagnoses the new one', async () => {
    await mkdir(join(root, '.claude/hooks'), { recursive: true });
    await writeFile(join(root, CLAUDE_SETTINGS), JSON.stringify(LEGACY_CLAUDE_SETTINGS), 'utf8');
    const config = await planConfig('claude-code', root, CLAUDE_SETTINGS);
    expect(config.hooks.PreToolUse).toHaveLength(1);
    expect(JSON.stringify(config.hooks.PreToolUse)).toContain('${CLAUDE_PROJECT_DIR}');
    await writeFile(join(root, CLAUDE_SETTINGS), JSON.stringify(config), 'utf8');
    await writeFile(join(root, '.claude/hooks/context-brake.mjs'), '', 'utf8');
    expect(await getAdapter('claude-code').diagnose({ projectRoot: root })).toEqual([]);
  });
});

describe('process hook commands locate the script from the project root (RF5)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-hook-path-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('resolves the Codex hook script from the git root', async () => {
    const config = await planConfig('codex-cli', root, '.codex/hooks.json');
    const entry = { type: 'command', command: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" PreToolUse' };
    expect(config.hooks.PreToolUse).toEqual([{ matcher: '*', hooks: [entry] }]);
  });

  it('runs the Copilot hook without a shell from the repository root', async () => {
    const config = await planConfig('github-copilot-cli', root, '.github/hooks/context-brake.json');
    const entry = { type: 'command', exec: 'node', args: ['.github/hooks/context-brake.mjs', 'preToolUse'], cwd: '.' };
    expect(config.hooks.preToolUse).toEqual([entry]);
  });

  it('keeps the Cursor path relative because project hooks run from the project root', async () => {
    const config = await planConfig('cursor', root, '.cursor/hooks.json');
    expect(config.hooks.preToolUse).toEqual([{ command: 'node .cursor/hooks/context-brake.mjs preToolUse', failClosed: true }]);
  });
});
