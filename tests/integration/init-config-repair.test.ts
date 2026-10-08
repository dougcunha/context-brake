import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { installReportSchema, type InstallReport } from '../../src/core/contracts/diagnostics.js';
import { parseConfiguration } from '../../src/core/validation/configuration-validator.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const RETIRED_KEYS = ['stateStorage', 'instructionFiles', 'brake', 'lightMode', 'runner'] as const;
const CONFIG_FILE = 'context-brake.config.json';

function earlierBuildConfig(): Record<string, unknown> {
  const zones = { ...DEFAULT_CONFIG.telemetry.zones, legacy: 1 };
  const retired = Object.fromEntries(RETIRED_KEYS.map((key) => [key, { mode: 'old' }]));
  return { ...DEFAULT_CONFIG, ...retired, telemetry: { ...DEFAULT_CONFIG.telemetry, zones } };
}

async function writeProject(dir: string, config: Record<string, unknown>): Promise<string> {
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, '.claude/settings.json'), '{\n}\n', 'utf8');
  const content = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(join(dir, CONFIG_FILE), content, 'utf8');
  return content;
}

async function dryRunReport(dir: string): Promise<InstallReport> {
  const result = await runInProcessCli(['init', '--dry-run', '--json'], dir);
  return installReportSchema.parse(JSON.parse(result.stdout));
}

describe('FR-02 init repairs a configuration with unrecognized keys (prd-15)', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'cb-t02-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('previews every key to drop and writes nothing on a dry run (FR-02, TC-04)', async () => {
    const original = await writeProject(dir, earlierBuildConfig());
    const change = (await dryRunReport(dir)).plan.changes.find((item) => item.owner === 'config');
    const summary = change?.preview.summary ?? '';
    for (const path of [...RETIRED_KEYS, 'telemetry.zones.legacy']) expect(summary).toContain(path);
    expect(summary).toContain('drop unrecognized keys:');
    expect(await readFile(join(dir, CONFIG_FILE), 'utf8')).toBe(original);
  });
  it('rewrites a valid file that keeps the recognized values, then plans no configuration change (FR-02, NFR-01, TC-04)', async () => {
    await writeProject(dir, earlierBuildConfig());
    expect((await runInProcessCli(['init', '--yes'], dir)).code).toBeLessThanOrEqual(1);
    const written = parseConfiguration(JSON.parse(await readFile(join(dir, CONFIG_FILE), 'utf8')));
    expect(written.telemetry).toEqual(DEFAULT_CONFIG.telemetry);
    expect(written.snapshot).toEqual(DEFAULT_CONFIG.snapshot);
    expect(Object.keys(written)).not.toEqual(expect.arrayContaining([...RETIRED_KEYS]));
    expect((await dryRunReport(dir)).plan.changes.filter((item) => item.owner === 'config')).toEqual([]);
  });
});

describe('FR-02 init confirmation and refusal (prd-15)', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'cb-t02-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('asks for confirmation like any other write when stdin is not a terminal (FR-02, TC-05)', async () => {
    const original = await writeProject(dir, earlierBuildConfig());
    const result = await runInProcessCli(['init', '--json'], dir);
    expect(result.code).toBe(2);
    expect(result.stdout).toContain('CONFIRMATION_REQUIRED');
    expect(await readFile(join(dir, CONFIG_FILE), 'utf8')).toBe(original);
  });
  it('does not repair a file whose typo leaves a required key missing (FR-02, TC-04)', async () => {
    const withoutTelemetry = Object.fromEntries(Object.entries(DEFAULT_CONFIG).filter(([key]) => key !== 'telemetry'));
    const original = await writeProject(dir, { ...withoutTelemetry, telemtry: DEFAULT_CONFIG.telemetry });
    const result = await runInProcessCli(['init', '--yes', '--json'], dir);
    expect(result.code).toBe(2);
    expect(result.stdout).toContain('telemtry is not a recognized key');
    expect(await readFile(join(dir, CONFIG_FILE), 'utf8')).toBe(original);
  });
});
