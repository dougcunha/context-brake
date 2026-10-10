import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';

const CLAUDE_MD = '# Project rules\n\nKeep this line.\n';
const INVALID_ARGUMENTS_EXIT_CODE = 64;

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}
async function createClaudeFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'cb-e2e-07-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
  await writeFile(join(root, 'CLAUDE.md'), CLAUDE_MD, 'utf8');
  return root;
}
async function seedRuntimeAndPlan(root: string): Promise<void> {
  await mkdir(join(root, '.context-brake/runtime/sessions'), { recursive: true });
  await writeFile(join(root, '.context-brake/runtime/sessions/s1.json'), '{}', 'utf8');
  await writeFile(join(root, 'task_plan.json'), JSON.stringify({ task: 'keep me' }), 'utf8');
}

describe('E2E-07: init and remove without support files (FR-08, DEC-04, DEC-11, TC-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await createClaudeFixture(); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('installs no protocol file, instruction block, or gitignore change, then remove deletes the manifest assets, the config, and the owned runtime files', async () => {
    expect((await runInProcessCli(['init', '--yes'], tempDir)).code).toBe(0);
    expect(await exists(join(tempDir, 'docs/context-brake-protocol.md'))).toBe(false);
    expect(await exists(join(tempDir, '.gitignore'))).toBe(false);
    expect(await readFile(join(tempDir, 'CLAUDE.md'), 'utf8')).toBe(CLAUDE_MD);
    await seedRuntimeAndPlan(tempDir);
    expect((await runInProcessCli(['remove', '--yes'], tempDir)).code).toBe(0);
    expect(await exists(join(tempDir, '.claude/hooks/context-brake.mjs'))).toBe(false);
    expect(await exists(join(tempDir, 'context-brake.config.json'))).toBe(false);
    expect(await exists(join(tempDir, '.context-brake'))).toBe(false);
    expect(await exists(join(tempDir, 'task_plan.json'))).toBe(true);
    expect(await readFile(join(tempDir, 'CLAUDE.md'), 'utf8')).toBe(CLAUDE_MD);
  });

  it('rejects the removed --remove-state flag', async () => {
    const result = await runInProcessCli(['remove', '--yes', '--remove-state', '--json'], tempDir);
    expect(result.code).toBe(INVALID_ARGUMENTS_EXIT_CODE);
    expect(`${result.stdout}${result.stderr}`).toContain('INVALID_ARGUMENTS');
  });
});

describe('E2E-08: Doctor JSON validates schema (CA-14, CA-15, CA-16, CA-17, CA-18)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-08-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('validates against published schema', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await runInProcessCli(['init', '--yes'], tempDir);
    const docResult = await runInProcessCli(['doctor', '--json'], tempDir);
    expect(docResult.code).toBe(1);
    const parsed = JSON.parse(docResult.stdout) as unknown;
    const validated = doctorReportSchema.parse(parsed);
    expect(validated.command).toBe('doctor');
    expect(validated.schemaVersion).toBe(1);
    expect(validated.status).toBe('warnings');
    expect(validated.findings.some((f) => f.code === 'VERSION_FLOOR_UNVERIFIED')).toBe(true);
    expect(validated.integrations.length).toBeGreaterThan(0);
    expect(validated.integrations[0]?.harness).toBe('claude-code');
  });
});
