import { lstat, mkdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from 'vitest';

export async function setupClaudeFixture(dir: string): Promise<void> {
  await mkdir(join(dir, '.claude'), { recursive: true });
  const settingsContent = JSON.stringify({ hooks: { UserHook: 'node custom.js' } }, null, 2);
  await writeFile(join(dir, '.claude/settings.json'), `${settingsContent}\n`, 'utf8');
  await writeFile(join(dir, 'CLAUDE.md'), '# Claude Guide\n', 'utf8');
}

export async function verifyClaudeInstalled(dir: string): Promise<void> {
  const config = await stat(join(dir, 'context-brake.config.json'));
  expect(config.isFile()).toBe(true);
  const hook = await stat(join(dir, '.claude/hooks/context-brake.mjs'));
  expect(hook.isFile()).toBe(true);
  const content = await readFile(join(dir, '.claude/settings.json'), 'utf8');
  const settings = JSON.parse(content) as { hooks: Record<string, unknown> };
  expect(settings.hooks.UserHook).toBe('node custom.js');
  expect(settings.hooks.PreToolUse).toBeDefined();
}

export async function tryCreateSymlink(target: string, link: string): Promise<boolean> {
  try {
    await symlink(target, link);
    return true;
  } catch {
    return false;
  }
}

export async function verifySymlinkScenario(dir: string): Promise<void> {
  const content = await readFile(join(dir, 'CLAUDE.md'), 'utf8');
  const matches = content.match(/<!-- CONTEXTBRAKE:START -->/g);
  expect(matches).toHaveLength(1);
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
  const claudeMd = await readFile(join(dir, 'CLAUDE.md'), 'utf8');
  expect(claudeMd.match(/<!-- CONTEXTBRAKE:START -->/g)).toHaveLength(1);
}

export async function testSymlinkTarget(runner: (args: string[]) => Promise<{ code: number | null }>, dir: string): Promise<void> {
  const claudePath = join(dir, 'CLAUDE.md');
  const agentsPath = join(dir, 'AGENTS.md');
  await writeFile(claudePath, '# Instructions\n', 'utf8');
  const created = await tryCreateSymlink('CLAUDE.md', agentsPath);
  if (!created) return;
  const res = await runner(['init', '--yes']);
  expect(res.code).toBe(0);
  await verifySymlinkScenario(dir);
}
