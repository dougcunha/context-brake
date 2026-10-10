import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { HarnessId } from '../../src/core/contracts/harness.js';
import { getAdapter } from '../../src/infrastructure/harnesses/registry.js';

type HookConfig = { hooks: Record<string, unknown> };

const CLAUDE_SETTINGS = '.claude/settings.json';
const CLAUDE_SCRIPT = '${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs';
const CODEX_ALIAS = 'git -c "alias.contextbrake=!node .codex/hooks/context-brake.mjs" contextbrake';
const LEGACY_CLAUDE_SETTINGS = { hooks: { PostToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: 'node .claude/hooks/context-brake.mjs PostToolUse' }] }] } };

const SESSION_MATCHER = 'startup|resume|clear|compact';

function claudeGroup(event: string, matcher = '*'): unknown[] {
  return [{ matcher, hooks: [{ type: 'command', command: 'node', args: [CLAUDE_SCRIPT, event] }] }];
}

function codexGroup(event: string, matcher = '*'): unknown[] {
  return [{ matcher, hooks: [{ type: 'command', command: `${CODEX_ALIAS} ${event}` }] }];
}

function cursorEntry(event: string): unknown[] {
  return [{ command: `node .cursor/hooks/context-brake.mjs ${event}` }];
}

function copilotEntry(event: string): unknown[] {
  return [{ type: 'command', exec: 'node', args: ['.github/hooks/context-brake.mjs', event], cwd: '.' }];
}

type Registration = { readonly name: string; readonly harness: HarnessId; readonly path: string; readonly hooks: Record<string, unknown> };

const REGISTRATIONS: readonly Registration[] = [
  { name: 'Claude Code in exec form from the project directory placeholder', harness: 'claude-code', path: CLAUDE_SETTINGS, hooks: {
    PostToolUse: claudeGroup('PostToolUse'), SessionStart: claudeGroup('SessionStart', SESSION_MATCHER), Stop: claudeGroup('Stop'),
  } },
  { name: 'Codex through a git alias that every shell runs the same way, without commandWindows', harness: 'codex-cli', path: '.codex/hooks.json', hooks: {
    PostToolUse: codexGroup('PostToolUse'), SessionStart: codexGroup('SessionStart', SESSION_MATCHER), Stop: codexGroup('Stop'),
  } },
  { name: 'Cursor with a relative path and no failClosed', harness: 'cursor', path: '.cursor/hooks.json', hooks: {
    postToolUse: cursorEntry('postToolUse'), sessionStart: cursorEntry('sessionStart'), preCompact: cursorEntry('preCompact'),
  } },
  { name: 'Copilot without a shell from the repository root, in the owned config file', harness: 'github-copilot-cli', path: '.github/hooks/context-brake.json', hooks: {
    postToolUse: copilotEntry('postToolUse'), sessionStart: copilotEntry('sessionStart'), preCompact: copilotEntry('preCompact'),
  } },
];

async function planConfig(harness: HarnessId, root: string, configPath: string): Promise<HookConfig> {
  const plan = await getAdapter(harness).planInstall({ projectRoot: root });
  const change = plan.changes.find((candidate) => candidate.path === configPath);
  return JSON.parse(change?.content ?? '{}') as HookConfig;
}

let root = '';
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-hook-path-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('process hook registrations keep each harness command form (RF5, DEC-12, DEC-13, TC-26)', () => {
  it.each(REGISTRATIONS)('registers exactly the post-tool, session-start, and new-event hooks for $name', async ({ harness, path, hooks }) => {
    const config = await planConfig(harness, root, path);
    expect(config.hooks).toEqual(hooks);
  });

  it('replaces the relative Claude Code command left by an earlier install and diagnoses the new one (RF5)', async () => {
    await mkdir(join(root, '.claude/hooks'), { recursive: true });
    await writeFile(join(root, CLAUDE_SETTINGS), JSON.stringify(LEGACY_CLAUDE_SETTINGS), 'utf8');
    const config = await planConfig('claude-code', root, CLAUDE_SETTINGS);
    expect(config.hooks.PostToolUse).toEqual(claudeGroup('PostToolUse'));
    await writeFile(join(root, CLAUDE_SETTINGS), JSON.stringify(config), 'utf8');
    await writeFile(join(root, '.claude/hooks/context-brake.mjs'), '', 'utf8');
    expect((await getAdapter('claude-code').diagnose({ projectRoot: root })).filter((finding) => finding.severity !== 'ok')).toEqual([]);
  });

  it('registers the Antigravity events under the context-brake key (DEC-14, TC-34)', async () => {
    const config = (await planConfig('antigravity-cli', root, '.agents/hooks.json')) as unknown as { 'context-brake': Record<string, unknown> };
    expect(Object.keys(config['context-brake'])).toEqual(['PreInvocation', 'PostToolUse']);
  });
});
