import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CONFIG_FILE = 'context-brake.config.json';

const invalidConfig = JSON.stringify({
  schemaVersion: 1,
  activeHarnesses: ['claude-code'],
  telemetry: {
    injectionMode: 'threshold_only',
    activationThresholdPercentage: 50,
    contextWindowCeiling: 128000,
    turnCeiling: 12,
    zones: { greenMaxPercentage: 60, yellowMaxPercentage: 50, criticalPercentage: 75, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 },
  },
}, null, 2);

describe('IT-10: Invalid ContextBrake config blocks writes and remains diagnosable (CA-13)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it10-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('blocks init and remove with exit code 2 leaving the repository unchanged, and doctor reports INVALID_CONTEXTBRAKE_CONFIG with exit code 2', async () => {
    await writeFile(join(tempDir, CONFIG_FILE), invalidConfig, 'utf8');
    expect((await runInProcessCli(['init', '--yes', '--json'], tempDir)).code).toBe(2);
    expect((await runInProcessCli(['remove', '--yes', '--json'], tempDir)).code).toBe(2);
    expect(await readdir(tempDir)).toEqual([CONFIG_FILE]);
    expect(await readFile(join(tempDir, CONFIG_FILE), 'utf8')).toBe(invalidConfig);
    const doctor = await runInProcessCli(['doctor', '--json'], tempDir);
    expect(doctor.code).toBe(2);
    const report = doctorReportSchema.parse(JSON.parse(doctor.stdout));
    expect(report.findings).toContainEqual(expect.objectContaining({ code: 'INVALID_CONTEXTBRAKE_CONFIG', severity: 'error', path: CONFIG_FILE }));
  });
});
