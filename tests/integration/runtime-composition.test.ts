import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError } from '../../src/core/validation/configuration-validator.js';
import { loadRuntimeConfiguration } from '../../src/infrastructure/runtime/runtime-composition.js';

describe('runtime configuration loading (CMP-17)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-t04-compose-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('falls back to the default configuration when the file is missing', async () => {
    expect(await loadRuntimeConfiguration(root)).toEqual(DEFAULT_CONFIG);
  });
  it('parses a valid configuration file', async () => {
    const custom = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, contextWindowCeiling: 200000 } };
    await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(custom), 'utf8');
    expect((await loadRuntimeConfiguration(root)).telemetry.contextWindowCeiling).toBe(200000);
  });
  it('rejects an unreadable file with its own error, and invalid syntax and invalid values with the configuration error', async () => {
    await mkdir(join(root, 'context-brake.config.json'));
    await expect(loadRuntimeConfiguration(root)).rejects.toMatchObject({ code: 'EISDIR' });
    await rm(join(root, 'context-brake.config.json'), { recursive: true });
    await writeFile(join(root, 'context-brake.config.json'), 'not json', 'utf8');
    await expect(loadRuntimeConfiguration(root)).rejects.toMatchObject({ issues: [{ path: '(syntax)', received: 'not json', rule: 'must be valid JSON' }] });
    const mismatched = { ...DEFAULT_CONFIG, telemetry: { ...DEFAULT_CONFIG.telemetry, zones: { ...DEFAULT_CONFIG.telemetry.zones, greenMaxTurn: 11 } } };
    await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(mismatched), 'utf8');
    await expect(loadRuntimeConfiguration(root)).rejects.toBeInstanceOf(InvalidConfigurationError);
  });
});
