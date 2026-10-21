import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'vitest';
import { fixReportSchema, type FixReport } from '../../src/core/contracts/fix-report.js';
import { MANIFEST_RELATIVE_PATH } from '../../src/core/contracts/manifest.js';
import { CLAUDE_HOOK_FILE } from '../../src/infrastructure/harnesses/claude-code/planner.js';
import { NodeRuntimeErrorLog } from '../../src/infrastructure/runtime/node-runtime-logs.js';
import { runInProcessCli } from './in-process-cli.js';

export const CLAUDE_HOOK = CLAUDE_HOOK_FILE;
export const BRIDGE_SCRIPT = '.claude/hooks/context-brake-statusline.mjs';
export const CONFIG_FILE = 'context-brake.config.json';
export const STALE_HOOK_CONTENT = '// hook from an older ContextBrake package\n';
export const EDITED_HOOK_CONTENT = '// hook edited by the user\n';

type ManifestAssets = { assets: { path: string; sha256: string }[] };

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function createFixWorld(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function removeFixWorld(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

export async function installClaude(root: string, extraArgs: readonly string[] = []): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  const run = await runInProcessCli(['init', '--yes', '--json', '--harness', 'claude-code', ...extraArgs], root);
  expect(run.code).toBe(0);
}

export async function makeAssetOutdated(root: string, path: string = CLAUDE_HOOK): Promise<void> {
  const manifestPath = join(root, MANIFEST_RELATIVE_PATH);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ManifestAssets;
  const asset = manifest.assets.find((entry) => entry.path === path);
  expect(asset).toBeDefined();
  if (asset) asset.sha256 = sha256(STALE_HOOK_CONTENT);
  await writeFile(join(root, path), STALE_HOOK_CONTENT, 'utf8');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

export async function makeAssetModified(root: string, path: string = CLAUDE_HOOK): Promise<void> {
  await writeFile(join(root, path), EDITED_HOOK_CONTENT, 'utf8');
}

export async function readText(root: string, path: string): Promise<string> {
  return readFile(join(root, path), 'utf8');
}

export async function addRuntimeError(root: string): Promise<void> {
  await new NodeRuntimeErrorLog(root, { now: () => new Date() }).append('claude-code', { event: 'PostToolUse', code: 'UNEXPECTED', detail: 'RuntimeFailure' });
}

export async function fileHashes(root: string, paths: readonly string[]): Promise<string[]> {
  return Promise.all(paths.map(async (path) => sha256(await readFile(join(root, path), 'utf8').catch(() => '<absent>'))));
}

export async function fixJson(root: string, args: readonly string[]): Promise<FixReport> {
  const run = await runInProcessCli(['fix', '--json', ...args], root);
  const report = fixReportSchema.parse(JSON.parse(run.stdout));
  expect(run.code).toBe(report.exitCode);
  return report;
}

export function outcomeOf(report: FixReport, code: string): [string, string | null] | undefined {
  const item = report.outcomes.find((outcome) => outcome.code === code);
  return item === undefined ? undefined : [item.outcome, item.detail];
}
