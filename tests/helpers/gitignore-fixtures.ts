import { mkdir, mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ParsedInitArgs, ParsedRemoveArgs } from '../../src/cli/argument-parser.js';
import { renderIgnoreBlock } from '../../src/core/services/gitignore-markers.js';

export function gitignoreBlock(eol = '\n'): string {
  return renderIgnoreBlock('task_plan.json', 'state_checkpoint.json', eol);
}

export function initArgs(): ParsedInitArgs {
  return { command: 'init', dryRun: false, yes: true, json: true, harness: [], excludeHarness: [], instructionFile: [], createInstructions: false, migrateLegacy: false };
}

export function removeArgs(removeState: boolean): ParsedRemoveArgs {
  return { command: 'remove', dryRun: false, yes: true, json: true, removeState };
}

export async function writeHarnessSignal(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
}

export function countOccurrences(content: string, needle: string): number {
  return content.split(needle).length - 1;
}

export function pathExists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

export async function createRepo(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function setupHarnessRepo(prefix: string): Promise<string> {
  const dir = await createRepo(prefix);
  await writeHarnessSignal(dir);
  return dir;
}
