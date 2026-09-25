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
  stateStorage: { planFile: 'plans/task_plan.json', checkpointFile: 'state_checkpoint.json', instructCheckpointCommit: false, bootMaxTokens: 800 },
  instructionFiles: { targets: ['CLAUDE.md'], protocolFile: 'docs/context-brake-protocol.md' },
};
const LEGACY_TEXT = `${JSON.stringify(LEGACY_CONFIG, null, 2)}\n`;
let root: string;

beforeEach(async () => {
  root = await createClaudeProject('cb-init-legacy-');
  await writeFile(join(root, CONFIG_PATH), LEGACY_TEXT, 'utf8');
});
afterEach(async () => { await removeProject(root); });

describe('init migrates legacy turn limits (TC-20, FR-09, US-04)', () => {
  it('writes nothing on --dry-run', async () => {
    expect((await runCli(root, ['init', '--dry-run', '--json'])).code).toBe(0);
    expect(await readProjectFile(root, CONFIG_PATH)).toBe(LEGACY_TEXT);
  });
  it('removes the four turn fields and keeps the other keys', async () => {
    expect((await runCli(root, ['init', '--yes', '--json'])).code).toBe(0);
    const config = await readConfig(root);
    const telemetry = config['telemetry'] as Record<string, unknown>;
    expect(telemetry).not.toHaveProperty('turnCeiling');
    expect(telemetry['zones']).toEqual({ greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75 });
    expect(config['stateStorage']).toEqual(LEGACY_CONFIG.stateStorage);
    expect(config['instructionFiles']).toEqual(LEGACY_CONFIG.instructionFiles);
  });
  it('changes nothing on a second run and doctor reports no legacy finding', async () => {
    await runCli(root, ['init', '--yes', '--json']);
    const before = await readProjectFile(root, CONFIG_PATH);
    expect((await runCli(root, ['init', '--yes', '--json'])).code).toBe(0);
    expect(await readProjectFile(root, CONFIG_PATH)).toBe(before);
    expect((await runCli(root, ['doctor', '--json'])).stdout).not.toContain('LEGACY_TURN_LIMITS');
  });
  it('reports the retired defaults in doctor before migration', async () => {
    const doctor = await runCli(root, ['doctor', '--json']);
    expect(doctor.stdout).toContain('LEGACY_TURN_LIMITS');
    expect(doctor.stdout).toContain('retired defaults (7, 10, 12)');
  });
});
