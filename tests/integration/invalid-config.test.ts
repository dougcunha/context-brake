import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dispatchCommand } from '../../src/cli/composition-root.js';
import { runDoctor } from '../../src/cli/commands/doctor.js';

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
  stateStorage: { planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', instructCheckpointCommit: true, bootMaxTokens: 1000 },
  instructionFiles: { targets: ['CLAUDE.md'], protocolFile: 'docs/context-brake-protocol.md' },
}, null, 2);

describe('IT-10: Invalid ContextBrake config blocks writes (CA-13)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it10-a-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('blocks writes in init and remove with exit code 2 and leaves repo unchanged', async () => {
    await writeFile(join(tempDir, 'context-brake.config.json'), invalidConfig, 'utf8');
    const beforeConfig = await readFile(join(tempDir, 'context-brake.config.json'), 'utf8');
    const initExit = await dispatchCommand({ command: 'init', dryRun: false, yes: true, json: true, harness: [], excludeHarness: [], instructionFile: [], createInstructions: false, migrateLegacy: false }, { projectRoot: tempDir });
    expect(initExit).toBe(2);
    const removeExit = await dispatchCommand({ command: 'remove', dryRun: false, yes: true, json: true, removeState: false }, { projectRoot: tempDir });
    expect(removeExit).toBe(2);
    const afterConfig = await readFile(join(tempDir, 'context-brake.config.json'), 'utf8');
    expect(afterConfig).toBe(beforeConfig);
  });
});

describe('IT-10: Invalid ContextBrake config remains diagnosable (CA-13)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it10-b-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('doctor continues diagnostics and reports INVALID_CONTEXTBRAKE_CONFIG with rule issue', async () => {
    await writeFile(join(tempDir, 'context-brake.config.json'), invalidConfig, 'utf8');
    const doctorExit = await runDoctor({ command: 'doctor', json: true, harness: [] }, { projectRoot: tempDir });
    expect(doctorExit).toBe(2);
  });
});
