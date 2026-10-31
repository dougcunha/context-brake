import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { runCli } from './delegated-world.js';
import { jsonReport } from './light-world.js';

export const SHARED = '.claude/settings.json';
export const LOCAL = '.claude/settings.local.json';
export const SCRIPT = '.claude/hooks/context-brake.mjs';
export const INIT = ['init', '--yes', '--json', '--no-statusline-bridge'];
export const INIT_SHARED = [...INIT, '--no-gitignore'];
export const REMOVE = ['remove', '--yes', '--json'];
export const OWNED_EVENTS = ['PostToolUse', 'SessionStart', 'Stop'];
export const SHARED_USER_FILE = '{\n  // team settings\n  "permissions": { "allow": ["Bash(ls)"] },\n  "hooks": {\n    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "echo team" }] }]\n  }\n}\n';
export const LOCAL_USER_FILE = '{\n  // my overrides\n  "model": "opus"\n}\n';

export type HooksWorld = { readonly root: string };

export async function readIn(world: HooksWorld, path: string): Promise<string | null> {
  return readFile(join(world.root, path), 'utf8').catch(() => null);
}
export async function seedIn(world: HooksWorld, path: string, content: string): Promise<void> {
  await mkdir(dirname(join(world.root, path)), { recursive: true });
  await writeFile(join(world.root, path), content, 'utf8');
}
// Eventos cujos handlers apontam para o script do ContextBrake em um arquivo de configuração.
export async function hookEvents(world: HooksWorld, path: string): Promise<string[]> {
  const text = await readIn(world, path);
  if (text === null) return [];
  const parsed = JSON.parse(text.replace(/^\s*\/\/.*$/gm, '')) as { hooks?: Record<string, unknown> };
  return Object.keys(parsed.hooks ?? {}).filter((event) => JSON.stringify(parsed.hooks?.[event]).includes('context-brake.mjs')).sort();
}
export async function doctorFindings(world: HooksWorld): Promise<{ code: string; path: string | null }[]> {
  return jsonReport(await runCli(world.root, ['doctor', '--json', '--harness', 'claude-code'])).findings;
}
export async function doctorCodes(world: HooksWorld): Promise<string[]> {
  return (await doctorFindings(world)).map((finding) => finding.code);
}
