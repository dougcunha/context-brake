import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONFIG_PATH, createClaudeProject, readConfig, readProjectFile, removeProject, runCli } from '../helpers/delegated-world.js';

const LEGACY_TELEMETRY = {
  injectionMode: 'threshold_only', activationThresholdPercentage: 50, contextWindowCeiling: 128000, turnCeiling: 12,
  zones: { greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 },
};
const LEGACY_CONFIG = {
  schemaVersion: 1, activeHarnesses: ['claude-code'], telemetry: LEGACY_TELEMETRY,
};
const LEGACY_TEXT = `${JSON.stringify(LEGACY_CONFIG, null, 2)}\n`;
let root: string;

beforeEach(async () => {
  root = await createClaudeProject('cb-init-legacy-');
  await writeFile(join(root, CONFIG_PATH), LEGACY_TEXT, 'utf8');
});
afterEach(async () => { await removeProject(root); });

describe('init migrates legacy turn limits (TC-20, FR-09, US-04)', () => {
  it('reports the retired defaults in doctor and writes nothing on --dry-run', async () => {
    const doctor = await runCli(root, ['doctor', '--json']);
    expect(doctor.stdout).toContain('LEGACY_TURN_LIMITS');
    expect(doctor.stdout).toContain('retired defaults (7, 10, 12)');
    expect((await runCli(root, ['init', '--dry-run', '--json'])).code).toBe(0);
    expect(await readProjectFile(root, CONFIG_PATH)).toBe(LEGACY_TEXT);
  });
  it('removes the four turn fields keeping the other keys, changes nothing on a second run, and leaves doctor without the finding', async () => {
    expect((await runCli(root, ['init', '--yes', '--json'])).code).toBe(0);
    const config = await readConfig(root);
    const telemetry = config['telemetry'] as Record<string, unknown>;
    expect(telemetry).not.toHaveProperty('turnCeiling');
    expect(telemetry['zones']).toEqual({ greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75 });
    expect(config['activeHarnesses']).toEqual(LEGACY_CONFIG.activeHarnesses);
    const migrated = await readProjectFile(root, CONFIG_PATH);
    expect((await runCli(root, ['init', '--yes', '--json'])).code).toBe(0);
    expect(await readProjectFile(root, CONFIG_PATH)).toBe(migrated);
    expect((await runCli(root, ['doctor', '--json'])).stdout).not.toContain('LEGACY_TURN_LIMITS');
  });
});
