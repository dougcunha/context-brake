import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema, type DoctorReport } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const EXCLUDED_LINE = '- codex-cli: excluded by configuration';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

async function installBothThenExcludeCodex(root: string): Promise<void> {
  await mkdir(join(root, '.claude'), { recursive: true });
  await mkdir(join(root, '.codex'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  await writeFile(join(root, '.codex/hooks.json'), '{\n}\n', 'utf8');
  await runInProcessCli(['init', '--yes'], root);
  await runInProcessCli(['init', '--yes', '--exclude-harness', 'codex-cli'], root);
}

async function doctorReport(root: string): Promise<DoctorReport> {
  return doctorReportSchema.parse(JSON.parse((await runInProcessCli(['doctor', '--json'], root)).stdout));
}

describe('FR-06 and FR-08 doctor and remove with an excluded harness (prd-15, TC-16)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t07-')); await installBothThenExcludeCodex(root); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('doctor reports the harness as excluded, never as missing, and doctor and init text show the excluded line (FR-06, NFR-04, TC-13, TC-16)', async () => {
    const report = await doctorReport(root);
    const doctor = await runInProcessCli(['doctor'], root);
    const init = await runInProcessCli(['init', '--dry-run'], root);
    expect(report.detections.find((item) => item.harness === 'codex-cli')?.state).toBe('excluded');
    expect(report.integrations.map((integration) => integration.harness)).toEqual(['claude-code']);
    expect(report.findings.filter((finding) => finding.harness === 'codex-cli')).toEqual([]);
    expect(doctor.stdout + doctor.stderr).toContain(EXCLUDED_LINE);
    expect(init.stdout + init.stderr).toContain(EXCLUDED_LINE);
  });
  it('remove deletes the configuration, exclusion included, and leaves no artifact (FR-08, TC-16)', async () => {
    expect((await runInProcessCli(['remove', '--yes'], root)).code).toBe(0);
    for (const path of ['context-brake.config.json', '.context-brake/manifest.json', '.claude/hooks/context-brake.mjs', '.codex/hooks/context-brake.mjs']) {
      expect(await exists(join(root, path))).toBe(false);
    }
    expect((await runInProcessCli(['remove', '--yes'], root)).code).toBe(0);
  });
});

describe('FR-06 doctor when only excluded harnesses are detected (prd-15, TC-16)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t07-only-'));
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
    await runInProcessCli(['init', '--yes', '--exclude-harness', 'claude-code'], root);
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('explains that every detected harness is excluded (FR-06, TC-16)', async () => {
    const finding = (await doctorReport(root)).findings.find((item) => item.code === 'NO_PROJECT_HARNESS');
    expect(finding?.message).toBe('All detected harnesses are excluded by configuration.');
    expect(finding?.remediation).toBe('Include one with --harness <id>.');
  });
});
