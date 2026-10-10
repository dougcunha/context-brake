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

async function configPreview(dir: string): Promise<InstallReport['plan']['changes']> {
  const result = await runInProcessCli(['init', '--dry-run', '--json'], dir);
  return installReportSchema.parse(JSON.parse(result.stdout)).plan.changes.filter((item) => item.owner === 'config');
}

describe('FR-02 init repairs a configuration with unrecognized keys (prd-15)', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'cb-t02-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('asks for confirmation, previews every key to drop without writing, then rewrites a valid file and plans no configuration change (FR-02, NFR-01, TC-04, TC-05)', async () => {
    const original = await writeProject(dir, earlierBuildConfig());
    const unconfirmed = await runInProcessCli(['init', '--json'], dir);
    expect([unconfirmed.code, unconfirmed.stdout.includes('CONFIRMATION_REQUIRED')]).toEqual([2, true]);
    const summary = (await configPreview(dir))[0]?.preview.summary ?? '';
    for (const path of [...RETIRED_KEYS, 'telemetry.zones.legacy']) expect(summary).toContain(path);
    expect(summary).toContain('drop unrecognized keys:');
    expect(await readFile(join(dir, CONFIG_FILE), 'utf8')).toBe(original);
    expect((await runInProcessCli(['init', '--yes'], dir)).code).toBeLessThanOrEqual(1);
    const written = parseConfiguration(JSON.parse(await readFile(join(dir, CONFIG_FILE), 'utf8')));
    expect([written.telemetry, written.snapshot]).toEqual([DEFAULT_CONFIG.telemetry, DEFAULT_CONFIG.snapshot]);
    expect(await configPreview(dir)).toEqual([]);
  });
});
