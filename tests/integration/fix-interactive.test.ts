import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCliWith, type InProcessRunResult } from '../helpers/in-process-cli.js';
import { ScriptedPrompts } from '../helpers/scripted-prompts.js';
import { BRIDGE_SCRIPT, CLAUDE_HOOK, CONFIG_FILE, createFixWorld, EDITED_HOOK_CONTENT, fileHashes, installClaude, makeAssetModified, makeAssetOutdated, readText, removeFixWorld } from '../helpers/fix-world.js';

const TERMINAL = { stdinIsTty: true, stdoutIsTty: true };
const LOCAL_SETTINGS = '.claude/settings.local.json';
const USER_STATUSLINE = '{\n  "statusLine": { "type": "command", "command": "personal.sh" }\n}\n';
const WATCHED = [CLAUDE_HOOK, BRIDGE_SCRIPT, CONFIG_FILE, '.context-brake/manifest.json', LOCAL_SETTINGS];
let root: string;

function fixOnTerminal(prompts: ScriptedPrompts, args: readonly string[] = []): Promise<InProcessRunResult> {
  return runInProcessCliWith(['fix', ...args], { cwd: root, overrides: { terminal: TERMINAL, prompts } });
}

beforeEach(async () => { root = await createFixWorld('cb-fix-tty-'); });
afterEach(async () => { await removeFixWorld(root); });

describe('fix confirmation on a terminal (FR-04, OBJ-02, TC-11)', () => {
  it('shows the plan and writes nothing when the user answers no', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    const hashes = await fileHashes(root, WATCHED);
    const prompts = new ScriptedPrompts(['n']);
    const run = await fixOnTerminal(prompts);
    expect([run.code, prompts.asked]).toEqual([1, ['Apply the plan? [y/N] ']]);
    expect(run.stdout.indexOf('Plan')).toBeLessThan(run.stdout.indexOf('Nothing was written.'));
    expect(await fileHashes(root, WATCHED)).toEqual(hashes);
  });

  it('asks nothing with --yes on a terminal', async () => {
    await installClaude(root);
    await makeAssetOutdated(root);
    const prompts = new ScriptedPrompts([]);
    expect((await fixOnTerminal(prompts, ['--yes'])).code).toBe(0);
    expect(prompts.asked).toEqual([]);
  });
});

describe('fix decisions on a terminal (FR-05, NFR-02, TC-12)', () => {
  it.each([['y', 'replaces', true], ['n', 'keeps', false]])('answer %s %s the modified file', async (answer, _verb, isReplaced) => {
    await installClaude(root);
    await makeAssetModified(root);
    const run = await fixOnTerminal(new ScriptedPrompts([answer, 'y']));
    expect((await readText(root, CLAUDE_HOOK)) !== EDITED_HOOK_CONTENT).toBe(isReplaced);
    expect(run.stdout).toMatch(isReplaced ? /FIXED\s+ASSET_MODIFIED/ : /SKIPPED\s+ASSET_MODIFIED/);
  });

  it.each([['r', true], ['f', false]])('answer %s to the inactive bridge decides the status line', async (answer, hasBridge) => {
    await installClaude(root);
    await writeFile(join(root, LOCAL_SETTINGS), USER_STATUSLINE, 'utf8');
    const prompts = new ScriptedPrompts([answer, 'y']);
    await fixOnTerminal(prompts);
    expect(prompts.asked[0]).toContain('The status line bridge is inactive.');
    expect((await readText(root, LOCAL_SETTINGS)).includes('context-brake-statusline')).toBe(hasBridge);
  });

  it('answer s keeps every owned file and needs no confirmation (codereview_01 CR-01, codereview_02 OI-02)', async () => {
    await mkdir(join(root, '.git'), { recursive: true });
    await installClaude(root);
    await writeFile(join(root, LOCAL_SETTINGS), USER_STATUSLINE, 'utf8');
    const owned = [...WATCHED, '.gitignore'];
    const hashes = await fileHashes(root, owned);
    const prompts = new ScriptedPrompts(['s']);
    const run = await fixOnTerminal(prompts);
    expect([prompts.asked.length, await fileHashes(root, owned)]).toEqual([1, hashes]);
    expect(await readText(root, '.gitignore')).toContain(BRIDGE_SCRIPT);
    expect(run.stdout).toMatch(/SKIPPED\s+STATUSLINE_BRIDGE_INACTIVE/);
  });
});

describe('fix harness decision on a terminal (FR-05, TC-12)', () => {
  it.each([['claude-code', true], ['', false]])('answer "%s" to the missing harness decides the install', async (answer, isInstalled) => {
    await installClaude(root);
    await rm(join(root, '.claude'), { recursive: true, force: true });
    const prompts = new ScriptedPrompts([answer, 's', 'y']);
    await fixOnTerminal(prompts);
    expect(prompts.asked[0]).toContain('No harness is active.');
    expect(await readText(root, '.claude/settings.json').then(() => true, () => false)).toBe(isInstalled);
  });
});
