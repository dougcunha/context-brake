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

let root = '';
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-hook-path-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('Claude Code hook commands do not depend on the session directory (RF5)', () => {
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
  it('resolves the Codex hook script from the git root', async () => {
    const config = await planConfig('codex-cli', root, '.codex/hooks.json');
    const entry = {
      type: 'command',
      command: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" PreToolUse',
      commandWindows: 'for /f "delims=" %i in (\'git rev-parse --show-toplevel\') do @node "%i/.codex/hooks/context-brake.mjs" PreToolUse',
    };
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

describe('new event registrations keep each harness command form (DEC-12, DEC-13, TC-26)', () => {
  it('adds the exec-form Claude Code Stop group for the reset notice', async () => {
    const config = await planConfig('claude-code', root, CLAUDE_SETTINGS);
    const entry = { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs', 'Stop'] };
    expect(config.hooks.Stop).toEqual([{ matcher: '*', hooks: [entry] }]);
  });

  it('registers the Codex Stop group with both command forms', async () => {
    const config = await planConfig('codex-cli', root, '.codex/hooks.json');
    const entry = {
      type: 'command',
      command: 'node "$(git rev-parse --show-toplevel)/.codex/hooks/context-brake.mjs" Stop',
      commandWindows: 'for /f "delims=" %i in (\'git rev-parse --show-toplevel\') do @node "%i/.codex/hooks/context-brake.mjs" Stop',
    };
    expect(config.hooks.Stop).toEqual([{ matcher: '*', hooks: [entry] }]);
  });

  it('registers Cursor preCompact without failClosed', async () => {
    const config = await planConfig('cursor', root, '.cursor/hooks.json');
    expect(config.hooks.preCompact).toEqual([{ command: 'node .cursor/hooks/context-brake.mjs preCompact' }]);
  });

  it('registers Copilot preCompact in the owned config file', async () => {
    const config = await planConfig('github-copilot-cli', root, '.github/hooks/context-brake.json');
    const entry = { type: 'command', exec: 'node', args: ['.github/hooks/context-brake.mjs', 'preCompact'], cwd: '.' };
    expect(config.hooks.preCompact).toEqual([entry]);
  });

  it('registers the three Antigravity events under the context-brake key (DEC-14, TC-34)', async () => {
    const config = (await planConfig('antigravity-cli', root, '.agents/hooks.json')) as unknown as { 'context-brake': Record<string, unknown> };
    expect(Object.keys(config['context-brake'])).toEqual(['PreInvocation', 'PreToolUse', 'PostToolUse']);
  });
});
