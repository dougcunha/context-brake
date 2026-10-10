import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

type PackFile = { path: string };
type PackResult = [{ files: PackFile[] }];
type Manifest = { name: string; type: string; bin: Record<string, string>; engines: { node: string } };

const BIN_PATH = 'dist/src/cli/main.js';
const REQUIRED_FILES: readonly string[] = [
  BIN_PATH,
  'schemas/context-brake.config.schema.json',
  'schemas/doctor-report.schema.json',
  'schemas/install-report.schema.json',
  'docs/telemetry-block.md',
  'dist/assets/runtime/context-brake-runtime.mjs',
  'dist/assets/runtime/claude-code-hook.mjs',
  'dist/assets/runtime/claude-code-statusline.mjs',
  'dist/assets/runtime/claude-code-mod.mjs',
  'dist/assets/runtime/codex-cli-hook.mjs',
  'dist/assets/runtime/cursor-hook.mjs',
  'dist/assets/runtime/github-copilot-cli-hook.mjs',
  'dist/assets/runtime/antigravity-cli-hook.mjs',
  'dist/assets/runtime/opencode-plugin.js',
  'dist/assets/runtime/pi-extension.js',
  'dist/assets/runtime/omp-extension.js',
  'dist/assets/runtime/pi-restart.js',
  'dist/assets/runtime/omp-restart.js',
];
const REMOVED_FILES: readonly string[] = ['docs/context-brake-protocol.md', 'schemas/task-plan.schema.json', 'schemas/state-checkpoint.schema.json', 'schemas/run-summary.schema.json'];
const DEVELOPMENT_PREFIXES: readonly string[] = ['tests/', '.github/', '.agents/', 'tasks/'];

async function packedPaths(): Promise<string[]> {
  const { stdout } = await execAsync('npm pack --dry-run --json');
  const packInfo = JSON.parse(stdout) as PackResult;
  return packInfo[0]?.files.map((file) => file.path) ?? [];
}

function isDevelopmentFile(path: string): boolean {
  const isSource = path.endsWith('.ts') && !path.endsWith('.d.ts');
  return isSource || DEVELOPMENT_PREFIXES.some((prefix) => path.startsWith(prefix));
}

describe('published package (RF17, RF23, CA-19)', () => {
  it('packs the runtime assets, schemas, and an executable bin, without development files or the removed protocol doc and schemas (prd-12 DEC-15)', async () => {
    const paths = await packedPaths();
    const manifest = JSON.parse(await readFile('package.json', 'utf8')) as Manifest;
    expect(REQUIRED_FILES.filter((file) => !paths.includes(file))).toEqual([]);
    expect(paths.filter((path) => REMOVED_FILES.includes(path) || isDevelopmentFile(path))).toEqual([]);
    expect(manifest).toMatchObject({ name: 'context-brake', type: 'module', bin: { 'context-brake': BIN_PATH } });
    expect(manifest.engines.node).toContain('>=20');
    expect((await readFile(BIN_PATH, 'utf8')).startsWith('#!/usr/bin/env node')).toBe(true);
  });
});
