import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { fakeProcessRunner } from './fake-process-runner.js';
import { runInProcessCliWith, type InProcessRunResult } from './in-process-cli.js';

export const BLOCK_FILE = '.gitignore';

export async function makeGitProject(options: { git?: boolean; codex?: boolean } = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-p17-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  if (options.codex === true) {
    await mkdir(join(root, '.codex'), { recursive: true });
    await writeFile(join(root, '.codex/hooks.json'), '{\n}\n', 'utf8');
  }
  if (options.git !== false) await mkdir(join(root, '.git'), { recursive: true });
  return root;
}

export async function removeProject(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

export async function readIgnore(root: string): Promise<string | null> {
  return readFile(join(root, BLOCK_FILE), 'utf8').then((text) => text, () => null);
}

export async function runInit(root: string, args: readonly string[], runner: ProcessRunner = fakeProcessRunner): Promise<InProcessRunResult> {
  return runInProcessCliWith(['init', ...args], { cwd: root, overrides: { runner } });
}

export async function planOf(root: string, args: readonly string[]) {
  const run = await runInit(root, [...args, '--dry-run', '--json']);
  return installReportSchema.parse(JSON.parse(run.stdout));
}

export function blockLines(text: string | null): string[] {
  const lines = (text ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.startsWith('# >>> context-brake'));
  const end = lines.findIndex((line) => line.startsWith('# <<< context-brake'));
  return start === -1 || end === -1 ? [] : lines.slice(start + 1, end);
}

export function runnerListing(tracked: readonly string[]): ProcessRunner {
  const stdout = tracked.map((path) => `${path}\0`).join('');
  return { ...fakeProcessRunner, run: (request) => (request.executable === 'git' ? Promise.resolve({ status: 'completed', exitCode: 0, stdout, stderr: '' }) : fakeProcessRunner.run(request)) };
}
