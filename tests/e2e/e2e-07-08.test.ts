import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';

describe('E2E-07: Remove uninstalls owned integration only (CA-12)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-07-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('uninstalls owned integration while preserving state without --remove-state', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await runBuiltCli(['init', '--yes'], tempDir);
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify({ task: 'keep me' }), 'utf8');

    const removeRes = await runBuiltCli(['remove', '--yes'], tempDir);
    expect(removeRes.code).toBe(0);
    const planExists = await stat(join(tempDir, 'task_plan.json')).then(() => true).catch(() => false);
    expect(planExists).toBe(true);

    const hookExists = await stat(join(tempDir, '.claude/hooks/context-brake.mjs')).then(() => true).catch(() => false);
    expect(hookExists).toBe(false);

    const removeStateRes = await runBuiltCli(['remove', '--yes', '--remove-state'], tempDir);
    expect(removeStateRes.code).toBe(0);
    const planExistsAfter = await stat(join(tempDir, 'task_plan.json')).then(() => true).catch(() => false);
    expect(planExistsAfter).toBe(false);
  });
});

describe('E2E-08: Doctor JSON validates schema (CA-14, CA-15, CA-16, CA-17, CA-18)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-e2e-08-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('validates against published schema', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await runBuiltCli(['init', '--yes'], tempDir);

    const docResult = await runBuiltCli(['doctor', '--json'], tempDir);
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
