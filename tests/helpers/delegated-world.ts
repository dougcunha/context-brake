import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import { parseCliArgs } from '../../src/cli/argument-parser.js';
import { dispatchCommand } from '../../src/cli/composition-root.js';

export const PROTOCOL_PATH = 'docs/context-brake-protocol.md';
export const CONFIG_PATH = 'context-brake.config.json';
export const USER_CLAUDE = '# Project rules\n\nKeep this line.\n';
export type CommandRun = { readonly code: number; readonly stdout: string; readonly stderr: string };

export async function createClaudeProject(prefix: string): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, 'CLAUDE.md'), USER_CLAUDE, 'utf8');
  await writeFile(join(root, '.claude', 'settings.json'), '{}\n', 'utf8');
  return root;
}
export async function removeProject(root: string): Promise<void> {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
export async function runCli(root: string, argv: readonly string[]): Promise<CommandRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const out = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdout.push(String(chunk)); return true; });
  const err = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { stderr.push(String(chunk)); return true; });
  try {
    const code = await dispatchCommand(parseCliArgs(argv), { projectRoot: root });
    return { code, stdout: stdout.join(''), stderr: stderr.join('') };
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
}
export async function readProjectFile(root: string, path: string): Promise<string> {
  return readFile(join(root, path), 'utf8');
}
export async function readConfig(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readProjectFile(root, CONFIG_PATH)) as Record<string, unknown>;
}
