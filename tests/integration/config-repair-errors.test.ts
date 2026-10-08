import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { doctorReportSchema } from '../../src/core/contracts/diagnostics.js';
import { UNRECOGNIZED_KEYS_REMEDIATION } from '../../src/core/validation/configuration-validator.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const RETIRED_KEYS = ['stateStorage', 'instructionFiles', 'brake', 'lightMode', 'runner'] as const;
const CONFIG_FILE = 'context-brake.config.json';

function withRetiredKeys(): string {
  const config = { ...DEFAULT_CONFIG, activeHarnesses: ['claude-code'], ...Object.fromEntries(RETIRED_KEYS.map((key) => [key, {}])) };
  return `${JSON.stringify(config, null, 2)}\n`;
}

type ManifestAsset = { path: string; kind: string; sha256: string };

async function writeEarlierBuildConfig(dir: string, config: Record<string, unknown>): Promise<void> {
  const content = `${JSON.stringify(config, null, 2)}\n`;
  await writeFile(join(dir, CONFIG_FILE), content, 'utf8');
  const manifestPath = join(dir, '.context-brake/manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { assets: ManifestAsset[] };
  const assets = manifest.assets.map((asset) => asset.path === CONFIG_FILE ? { ...asset, sha256: createHash('sha256').update(content).digest('hex') } : asset);
  await writeFile(manifestPath, `${JSON.stringify({ ...manifest, assets }, null, 2)}\n`, 'utf8');
}

async function installWithEarlierBuildKeys(dir: string): Promise<void> {
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, '.claude/settings.json'), '{\n}\n', 'utf8');
  expect((await runInProcessCli(['init', '--yes'], dir)).code).toBe(0);
  const installed = JSON.parse(await readFile(join(dir, CONFIG_FILE), 'utf8')) as Record<string, unknown>;
  await writeEarlierBuildConfig(dir, { ...installed, stateStorage: {}, runner: {} });
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

describe('FR-01 retired configuration keys (prd-15, TC-02)', () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'cb-t01-')); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('doctor names every key with the fix in JSON and still diagnoses the active harness (FR-01, TC-02)', async () => {
    await writeFile(join(dir, CONFIG_FILE), withRetiredKeys(), 'utf8');
    const result = await runInProcessCli(['doctor', '--json'], dir);
    const report = doctorReportSchema.parse(JSON.parse(result.stdout));
    const finding = report.findings.find((item) => item.code === 'INVALID_CONTEXTBRAKE_CONFIG');
    expect(result.code).toBe(2);
    for (const key of RETIRED_KEYS) expect(finding?.message).toContain(`${key} is not a recognized key`);
    expect(finding?.remediation).toBe(UNRECOGNIZED_KEYS_REMEDIATION);
    expect(report.integrations.map((integration) => integration.harness)).toContain('claude-code');
  });
  it('doctor prints the keys and the remediation line in text (FR-01, NFR-04, TC-02)', async () => {
    await writeFile(join(dir, CONFIG_FILE), withRetiredKeys(), 'utf8');
    const result = await runInProcessCli(['doctor'], dir);
    expect(result.stderr).toContain('stateStorage is not a recognized key');
    expect(result.stderr).toContain(`Remediation: ${UNRECOGNIZED_KEYS_REMEDIATION}`);
  });
  it('remove proceeds past the keys and deletes the installation and the configuration (FR-01, FR-08, TC-02)', async () => {
    await installWithEarlierBuildKeys(dir);
    expect((await runInProcessCli(['remove', '--yes'], dir)).code).toBe(0);
    expect(await exists(join(dir, CONFIG_FILE))).toBe(false);
    expect(await exists(join(dir, '.claude/hooks/context-brake.mjs'))).toBe(false);
    expect(await exists(join(dir, '.context-brake/manifest.json'))).toBe(false);
    expect((await runInProcessCli(['remove', '--yes'], dir)).code).toBe(0);
  });
});
