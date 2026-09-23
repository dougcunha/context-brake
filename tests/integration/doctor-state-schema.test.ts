import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('doctor reports schema-invalid plan file (RF7, T07.4)', () => {
  let tempDir: string;
  let stdoutChunks: string[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-doc-schema-'));
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdoutChunks.push(String(chunk)); return true; });
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await writeFile(join(tempDir, 'context-brake.config.json'), JSON.stringify(sampleConfig, null, 2), 'utf8');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('reports finding for schema-invalid plan file and exits 2', async () => {
    await writeFile(join(tempDir, 'task_plan.json'), JSON.stringify({ schemaVersion: 1, taskId: 'bad' }), 'utf8');
    const exitCode = await runDoctor({ command: 'doctor', json: true, harness: [] }, { projectRoot: tempDir });
    expect(exitCode).toBe(2);
    const report = JSON.parse(stdoutChunks.join(''));
    const finding = report.findings.find((f: { code: string; path: string }) => f.code === 'INVALID_STATE_FILE' && f.path === 'task_plan.json');
    expect(finding).toBeTruthy();
    expect(finding.message).toContain('title');
  });
});

describe('doctor reports malformed json in state file (T07.5)', () => {
  let tempDir: string;
  let stdoutChunks: string[];

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-doc-bad-'));
    stdoutChunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { stdoutChunks.push(String(chunk)); return true; });
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
    await writeFile(join(tempDir, 'context-brake.config.json'), JSON.stringify(sampleConfig, null, 2), 'utf8');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('reports finding for malformed json checkpoint file', async () => {
    await writeFile(join(tempDir, 'state_checkpoint.json'), '{malformed', 'utf8');
    const exitCode = await runDoctor({ command: 'doctor', json: true, harness: [] }, { projectRoot: tempDir });
    expect(exitCode).toBe(2);
    const report = JSON.parse(stdoutChunks.join(''));
    const finding = report.findings.find((f: { code: string; path: string }) => f.code === 'INVALID_STATE_FILE' && f.path === 'state_checkpoint.json');
    expect(finding).toBeTruthy();
    expect(finding.message).toContain('invalid JSON');
  });
});

