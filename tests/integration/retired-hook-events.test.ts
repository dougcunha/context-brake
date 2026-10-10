import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

type ClaudeHooks = { hooks: Record<string, unknown[]> };

function ownedHandler(event: string) {
  return { type: 'command', command: 'node', args: ['${CLAUDE_PROJECT_DIR}/.claude/hooks/context-brake.mjs', event] };
}

function foreignHandler(name: string) {
  return { type: 'command', command: `echo ${name}` };
}

function claudeSettings(options: { owned: boolean; eol: string }): string {
  const { owned } = options;
  const preToolUse = [
    { matcher: '*', hooks: [...(owned ? [ownedHandler('PreToolUse')] : []), foreignHandler('same-group')] },
    { matcher: 'Bash', hooks: [foreignHandler('foreign-group')] },
    ...(owned ? [{ matcher: '*', hooks: [ownedHandler('PreToolUse')] }] : []),
  ];
  const hooks = {
    PreToolUse: preToolUse,
    ...(owned ? { PostCompact: [{ matcher: '*', hooks: [ownedHandler('PostCompact')] }] } : {}),
    UserPromptSubmit: [{ hooks: [foreignHandler('foreign-event')] }],
    SubagentStop: [],
  };
  const text = `${JSON.stringify({ permissions: { allow: ['Bash(ls)'] }, hooks }, null, 2)}\n`;
  return text.replace(/\n/g, options.eol);
}

const EOLS = [['LF', '\n'], ['CRLF', '\r\n']] as const;

async function settingsText(root: string): Promise<string> {
  return readFile(join(root, '.claude/settings.json'), 'utf8');
}

async function assertOnlyCurrentOwnedEvents(root: string): Promise<void> {
  const settings = JSON.parse(await settingsText(root)) as ClaudeHooks;
  const expected = JSON.parse(claudeSettings({ owned: false, eol: '\n' })) as ClaudeHooks;
  expect(settings.hooks.PreToolUse).toEqual(expected.hooks.PreToolUse);
  expect(settings.hooks.PostCompact).toBeUndefined();
  expect(settings.hooks.UserPromptSubmit).toEqual(expected.hooks.UserPromptSubmit);
  expect(settings.hooks.SubagentStop).toEqual([]);
  expect(Object.keys(settings.hooks)).toEqual(expect.arrayContaining(['PostToolUse', 'SessionStart', 'Stop']));
}

async function plannedSettingsChanges(root: string): Promise<unknown[]> {
  const result = await runInProcessCli(['init', '--dry-run', '--json'], root);
  return installReportSchema.parse(JSON.parse(result.stdout)).plan.changes.filter((change) => change.path === '.claude/settings.json');
}

describe.each(EOLS)('FR-03 and FR-04 retired Claude Code events with %s endings (prd-15, TC-06)', (_label, eol) => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t03-'));
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude/settings.json'), claudeSettings({ owned: true, eol }), 'utf8');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('init keeps only current owned events, a second init plans nothing, and remove restores the foreign content byte for byte (FR-03, FR-04, NFR-01, TC-06)', async () => {
    expect((await runInProcessCli(['init', '--yes'], root)).code).toBeLessThanOrEqual(1);
    await assertOnlyCurrentOwnedEvents(root);
    expect(await plannedSettingsChanges(root)).toEqual([]);
    expect((await runInProcessCli(['remove', '--yes'], root)).code).toBe(0);
    expect(await settingsText(root)).toBe(claudeSettings({ owned: false, eol }));
  });
  it('remove alone deletes owned entries under any event (FR-04, TC-06)', async () => {
    expect((await runInProcessCli(['remove', '--yes'], root)).code).toBe(0);
    expect(await settingsText(root)).toBe(claudeSettings({ owned: false, eol }));
  });
});

describe('FR-03 retired Claude Code events through a symbolic link (prd-15, TC-09)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t03-link-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {}); });

  it('edits the link target and keeps the link (NFR-02, TC-09)', async (ctx) => {
    await mkdir(join(root, '.agents'), { recursive: true });
    await writeFile(join(root, '.agents/settings.json'), claudeSettings({ owned: true, eol: '\n' }), 'utf8');
    await requireLink(ctx, await attemptLink(join(root, '.agents'), join(root, '.claude')), join(root, '.claude'));
    expect((await runInProcessCli(['init', '--yes'], root)).code).toBeLessThanOrEqual(1);
    const target = JSON.parse(await readFile(join(root, '.agents/settings.json'), 'utf8')) as { hooks: Record<string, unknown> };
    expect(target.hooks.PostCompact).toBeUndefined();
    expect((await lstat(join(root, '.claude'))).isSymbolicLink()).toBe(true);
  });
});
