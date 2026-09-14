import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runDoctor } from '../../src/cli/commands/doctor.js';

const sampleConfig = {
  schemaVersion: 1,
  activeHarnesses: ['claude-code'],
  telemetry: {
    injectionMode: 'threshold_only',
    activationThresholdPercentage: 50,
    contextWindowCeiling: 128000,
    turnCeiling: 12,
    zones: { greenMaxPercentage: 49, yellowMaxPercentage: 65, criticalPercentage: 75, greenMaxTurn: 7, yellowMaxTurn: 10, criticalTurn: 12 },
  },
  stateStorage: { planFile: 'task_plan.json', checkpointFile: 'state_checkpoint.json', instructCheckpointCommit: true, bootMaxTokens: 1000 },
  instructionFiles: { targets: ['CLAUDE.md'], protocolFile: 'docs/context-brake-protocol.md' },
};

describe('IT-11: Doctor detects manual integration removal (CA-14)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it11-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('detects missing active integration and terminates with error code 2', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await writeFile(join(tempDir, 'context-brake.config.json'), JSON.stringify(sampleConfig, null, 2), 'utf8');
    const exitCode = await runDoctor({ command: 'doctor', json: true, harness: [] }, { projectRoot: tempDir });
    expect(exitCode).toBe(2);
  });
});
