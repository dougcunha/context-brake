import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

type PackFile = { path: string };
type PackResult = [{ files: PackFile[] }];
type PackageJson = {
  name?: string;
  version?: string;
  type?: string;
  bin?: Record<string, string>;
  engines?: { node?: string };
};

const REQUIRED_FILES: readonly string[] = [
  'dist/src/cli/main.js',
  'schemas/context-brake.config.schema.json',
  'schemas/doctor-report.schema.json',
  'schemas/install-report.schema.json',
  'docs/context-brake-protocol.md',
  'dist/assets/runtime/context-brake-runtime.mjs',
  'dist/assets/runtime/claude-code-hook.mjs',
  'dist/assets/runtime/codex-cli-hook.mjs',
  'dist/assets/runtime/cursor-hook.mjs',
  'dist/assets/runtime/github-copilot-cli-hook.mjs',
  'dist/assets/runtime/antigravity-cli-hook.mjs',
  'dist/assets/runtime/opencode-plugin.js',
  'dist/assets/runtime/pi-extension.js',
  'dist/assets/runtime/omp-extension.js',
];

const FORBIDDEN_PREFIXES: readonly string[] = ['tests/', '.github/', '.agents/', 'tasks/'];

function validateManifest(manifest: PackageJson): void {
  if (manifest.name !== 'context-brake') throw new Error('Invalid package name');
  if (manifest.type !== 'module') throw new Error('Package type must be module');
  if (manifest.bin?.['context-brake'] !== 'dist/src/cli/main.js') throw new Error('Invalid bin mapping');
  if (!manifest.engines?.node?.includes('>=20')) throw new Error('Engine node >=20 required');
}

function checkRequiredFiles(packedPaths: Set<string>): void {
  for (const required of REQUIRED_FILES) {
    if (!packedPaths.has(required)) {
      throw new Error(`Published npm package is missing required file: ${required}`);
    }
  }
}

function checkForbiddenFiles(packedPaths: Set<string>): void {
  for (const path of packedPaths) {
    for (const prefix of FORBIDDEN_PREFIXES) {
      if (path.startsWith(prefix)) {
        throw new Error(`Published package contains forbidden development path: ${path}`);
      }
    }
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      throw new Error(`Published package contains uncompiled TypeScript source: ${path}`);
    }
  }
}

export async function verifyPackage(): Promise<void> {
  const manifestContent = await readFile('package.json', 'utf8');
  const manifest = JSON.parse(manifestContent) as PackageJson;
  validateManifest(manifest);
  const binPath = manifest.bin?.['context-brake'] ?? '';
  const binContent = await readFile(binPath, 'utf8');
  if (!binContent.startsWith('#!/usr/bin/env node')) {
    throw new Error('Binary entrypoint must begin with node shebang');
  }
  const { stdout } = await execAsync('npm pack --dry-run --json');
  const packInfo = JSON.parse(stdout) as PackResult;
  const packedPaths = new Set(packInfo[0]?.files.map((f) => f.path) ?? []);
  checkRequiredFiles(packedPaths);
  checkForbiddenFiles(packedPaths);
  process.stdout.write(`Verified ${packedPaths.size} packaged files; schemas, assets, and bin present.\n`);
}

await verifyPackage();
