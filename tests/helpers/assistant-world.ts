import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { runInProcessCli, runInProcessCliWith, type InProcessRunResult } from './in-process-cli.js';
import { snapshotTree } from './light-world.js';
import { ScriptedPrompts } from './scripted-prompts.js';
import { splitWords } from './shell-words.js';

export const TERMINAL = { stdinIsTty: true, stdoutIsTty: true };
export const CONFIRMATION_QUESTION = 'Apply ContextBrake installation plan?';
const EQUIVALENT_PREFIX = 'Equivalent command: context-brake init';

export type AssistedRun = InProcessRunResult & { readonly asked: readonly string[] };

export async function makeProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-p16t05-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  await writeFile(join(root, '.codex/hooks.json'), '{\n}\n', 'utf8');
  return root;
}

export async function copyProject(source: string): Promise<string> {
  const target = await mkdtemp(join(tmpdir(), 'cb-p16t05-'));
  await cp(source, target, { recursive: true });
  return target;
}

export async function removeProjects(...roots: readonly string[]): Promise<void> {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })));
}

export async function runAssisted(root: string, answers: readonly (string | null)[], args: readonly string[] = []): Promise<AssistedRun> {
  const prompts = new ScriptedPrompts(answers);
  const result = await runInProcessCliWith(['init', ...args], { cwd: root, overrides: { terminal: TERMINAL, prompts } });
  return { ...result, asked: prompts.asked };
}

export function printedFlags(stdout: string): string[] {
  const line = stdout.split('\n').find((candidate) => candidate.startsWith(EQUIVALENT_PREFIX));
  if (line === undefined) throw new Error(`No equivalent command in the output:\n${stdout}`);
  return splitWords(line.slice(EQUIVALENT_PREFIX.length), "'\\''");
}

export async function replay(root: string, flags: readonly string[], extra: readonly string[]): Promise<InProcessRunResult> {
  return runInProcessCli(['init', ...flags, ...extra], root);
}

export async function projectTree(root: string): Promise<Record<string, string>> {
  const spellings = [root.replaceAll('\\', '/'), root.replaceAll('\\', '\\\\')];
  const tree = await snapshotTree(root);
  return Object.fromEntries(Object.entries(tree).map(([path, content]) => [path, spellings.reduce((text, spelling) => text.replaceAll(spelling, '<root>'), content)]));
}

export function useProject(): () => string {
  let root = '';
  beforeEach(async () => { root = await makeProject(); });
  afterEach(async () => { await removeProjects(root); });
  return () => root;
}
