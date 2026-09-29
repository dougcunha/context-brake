import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createClaudeProject, runCli, type CommandRun } from './delegated-world.js';

export const USER_AGENTS = '# Agent rules\n\nStay here.\n';
export const LEGACY_DEBUG_MODE_LINE = 'Debug mode: end each reply that received a ContextBrake telemetry block with the line `📊 ContextBrake: <usage>% · <used>/<window> (<window origin>) · <source> · <ZONE>`, copied from the latest block.';
export const PLAIN_INIT = ['init', '--yes', '--json'] as const;
export const LIGHT_INIT = [...PLAIN_INIT, '--light'] as const;
export const FULL_INIT = [...PLAIN_INIT, '--no-light'] as const;
const SKIPPED_DIRECTORIES = new Set(['sessions', 'runtime']);

export async function createLightProject(prefix: string): Promise<string> {
  const root = await createClaudeProject(prefix);
  await writeFile(join(root, 'AGENTS.md'), USER_AGENTS, 'utf8');
  return root;
}
export async function snapshotTree(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const path = relative(root, join(entry.parentPath, entry.name)).split('\\').join('/');
    files[path] = await readFile(join(root, path), 'utf8');
  }
  return files;
}
export function changedPaths(before: Record<string, string>, after: Record<string, string>): string[] {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...paths].filter((path) => before[path] !== after[path]).sort();
}
export function jsonReport(run: CommandRun): { plan: { changes: { path: string }[] }; findings: { code: string; path: string | null }[] } {
  return JSON.parse(run.stdout) as { plan: { changes: { path: string }[] }; findings: { code: string; path: string | null }[] };
}
export { runCli };
