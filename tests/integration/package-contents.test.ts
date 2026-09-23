import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

type PackFile = { path: string };
type PackResult = [{ files: PackFile[] }];

const REQUIRED_FILES: readonly string[] = [
  'dist/src/cli/main.js',
  'schemas/context-brake.config.schema.json',
  'schemas/doctor-report.schema.json',
  'schemas/install-report.schema.json',
  'schemas/state-checkpoint.schema.json',
  'schemas/task-plan.schema.json',
  'docs/context-brake-protocol.md',
  'docs/telemetry-block.md',
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

describe('package contents assets and schemas (RF17, CA-19)', () => {
  it('includes all required runtime assets, schemas, protocol, and binary', async () => {
    const { stdout } = await execAsync('npm pack --dry-run --json');
    const packInfo = JSON.parse(stdout) as PackResult;
    const packedPaths = new Set(packInfo[0]?.files.map((f) => f.path) ?? []);
    for (const required of REQUIRED_FILES) expect(packedPaths.has(required)).toBe(true);
    for (const path of packedPaths) {
      expect(path.startsWith('tests/')).toBe(false);
      expect(path.startsWith('.github/')).toBe(false);
      expect(path.startsWith('.agents/')).toBe(false);
      expect(path.startsWith('tasks/')).toBe(false);
      if (path.endsWith('.ts')) expect(path.endsWith('.d.ts')).toBe(true);
    }
  });

  it('validates that published config schema is usable JSON (RF17)', async () => {
    const schemaContent = await readFile('schemas/context-brake.config.schema.json', 'utf8');
    const schema = JSON.parse(schemaContent) as { type: string; properties: Record<string, unknown> };
    expect(schema.type).toBe('object');
    expect(schema.properties.schemaVersion).toBeDefined();
  });
});

describe('package manifest inputs and shebang (RF23)', () => {
  it('validates package manifest inputs and binary shebang', async () => {
    const content = await readFile('package.json', 'utf8');
    const manifest = JSON.parse(content) as {
      name: string; type: string; bin: Record<string, string>; engines: { node: string };
    };
    expect(manifest.name).toBe('context-brake');
    expect(manifest.type).toBe('module');
    expect(manifest.bin['context-brake']).toBe('dist/src/cli/main.js');
    expect(manifest.engines.node).toContain('>=20');
    const binContent = await readFile('dist/src/cli/main.js', 'utf8');
    expect(binContent.startsWith('#!/usr/bin/env node')).toBe(true);
  });
});

describe('published plan and checkpoint schemas (RF6)', () => {
  it('validates that published plan and checkpoint schemas are usable JSON', async () => {
    for (const file of ['schemas/task-plan.schema.json', 'schemas/state-checkpoint.schema.json']) {
      const content = await readFile(file, 'utf8');
      const schema = JSON.parse(content) as { type: string; properties: Record<string, unknown> };
      expect(schema.type).toBe('object');
      expect(schema.properties.schemaVersion).toBeDefined();
    }
  });
});
