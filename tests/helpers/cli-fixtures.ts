import { lstat, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from 'vitest';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

type LinkContext = Parameters<typeof requireLink>[0];

const USER_INSTRUCTIONS = '# Claude Guide\n';
const LINKED_INSTRUCTIONS = '# Instructions\n';

export async function setupClaudeFixture(dir: string): Promise<void> {
  await mkdir(join(dir, '.claude'), { recursive: true });
  const settingsContent = JSON.stringify({ hooks: { UserHook: 'node custom.js' } }, null, 2);
  await writeFile(join(dir, '.claude/settings.json'), `${settingsContent}\n`, 'utf8');
  await writeFile(join(dir, 'CLAUDE.md'), USER_INSTRUCTIONS, 'utf8');
}

export async function verifyClaudeInstalled(dir: string): Promise<void> {
  const config = await stat(join(dir, 'context-brake.config.json'));
  expect(config.isFile()).toBe(true);
  const hook = await stat(join(dir, '.claude/hooks/context-brake.mjs'));
  expect(hook.isFile()).toBe(true);
  const content = await readFile(join(dir, '.claude/settings.json'), 'utf8');
  const settings = JSON.parse(content) as { hooks: Record<string, unknown> };
  expect(settings.hooks.UserHook).toBe('node custom.js');
  expect(settings.hooks.PostToolUse).toBeDefined();
  expect(settings.hooks.PreToolUse).toBeUndefined();
}

export async function verifySymlinkScenario(dir: string): Promise<void> {
  expect(await readFile(join(dir, 'CLAUDE.md'), 'utf8')).toBe(LINKED_INSTRUCTIONS);
  const linkStat = await lstat(join(dir, 'AGENTS.md'));
  expect(linkStat.isSymbolicLink()).toBe(true);
}

export async function testClaudeInstall(runner: (args: string[]) => Promise<{ code: number | null; stdout: string }>, dir: string): Promise<void> {
  await setupClaudeFixture(dir);
  const res = await runner(['init', '--yes']);
  expect(res.code).toBe(0);
  expect(res.stdout).toContain('claude-code');
  await verifyClaudeInstalled(dir);
}

export async function testIdempotency(runner: (args: string[]) => Promise<{ code: number | null; stdout: string }>, dir: string): Promise<void> {
  await setupClaudeFixture(dir);
  for (let i = 0; i < 3; i += 1) {
    const res = await runner(['init', '--yes']);
    expect(res.code).toBe(0);
  }
  await verifyClaudeInstalled(dir);
  expect(await readFile(join(dir, 'CLAUDE.md'), 'utf8')).toBe(USER_INSTRUCTIONS);
}

export async function testSymlinkTarget(runner: (args: string[]) => Promise<{ code: number | null }>, dir: string, ctx: LinkContext): Promise<void> {
  const agentsPath = join(dir, 'AGENTS.md');
  await writeFile(join(dir, 'CLAUDE.md'), LINKED_INSTRUCTIONS, 'utf8');
  await requireLink(ctx, await attemptLink('CLAUDE.md', agentsPath, 'file'), agentsPath);
  expect((await lstat(agentsPath)).isSymbolicLink()).toBe(true);
  const res = await runner(['init', '--yes']);
  expect(res.code).toBe(0);
  await verifySymlinkScenario(dir);
}
