import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { parseCliArgs } from '../../src/cli/argument-parser.js';
import { dispatchCommand } from '../../src/cli/composition-root.js';
import { createClaudeProject, removeProject } from './delegated-world.js';
import { fakeOverheadMeasurer } from './fake-overhead-measurer.js';
import { fakeProcessRunner } from './fake-process-runner.js';

export const LOCAL_PATH = '.claude/settings.local.json';
export const STATE_PATH = '.context-brake/runtime/claude-statusline.json';
export const BRIDGE_PATH = '.claude/hooks/context-brake-statusline.mjs';
export const INSTALL = ['init', '--yes', '--json', '--statusline-bridge'];

export type StatuslineWorld = { readonly root: string; readonly home: string };
export type InstallReportView = { readonly exitCode: number; readonly plan: { readonly changes: readonly { readonly path: string }[] }; readonly findings: readonly { readonly code: string }[] };

export async function createStatuslineWorld(): Promise<StatuslineWorld> {
  return { root: await createClaudeProject('cb-statusline-install-'), home: await mkdtemp(join(tmpdir(), 'cb-statusline-home-')) };
}
export async function removeStatuslineWorld(world: StatuslineWorld): Promise<void> {
  await removeProject(world.root);
  await rm(world.home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
export type RunOptions = { readonly home?: string | null; readonly runner?: ProcessRunner };
export async function runJson(world: StatuslineWorld, argv: readonly string[], options: RunOptions = {}): Promise<InstallReportView> {
  const home = options.home === undefined ? world.home : options.home;
  const stdout: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdout.push(String(chunk)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  try {
    await dispatchCommand(parseCliArgs(argv), { projectRoot: world.root, ...(home === null ? {} : { userHome: home }), overheadMeasurer: fakeOverheadMeasurer, runner: options.runner ?? fakeProcessRunner });
  } finally {
    vi.restoreAllMocks();
  }
  return JSON.parse(stdout.join('')) as InstallReportView;
}
export async function readWorldFile(world: StatuslineWorld, path: string): Promise<string | null> {
  return readFile(join(world.root, path), 'utf8').catch(() => null);
}
export function localStatusline(text: string | null): Record<string, unknown> {
  return (JSON.parse((text ?? '').replace(/^\s*\/\/.*$/gm, '')) as { statusLine: Record<string, unknown> }).statusLine;
}
