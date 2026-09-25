import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runWrap } from '../../src/cli/commands/wrap.js';
import { runDirectory } from '../../src/infrastructure/runner/run-paths.js';
import { NodeSessionLedger } from '../../src/infrastructure/runtime/node-session-ledger.js';
import { delegatedConfig } from '../helpers/delegated-fixtures.js';
import { captureOutput, clock, COMMAND_FIXTURE, createProject, makeSubdirectory, removeProject, SESSION_ID, seedToolLine, startRunnerSession } from '../helpers/wrap-world.js';

const EXIT_THREE = { command: 'wrap' as const, json: false as const, argv: [process.execPath, COMMAND_FIXTURE, 'exit', '3'] };
const GREEN_LINE = { toolUseId: 'toolu_1', observedCharacters: 100, turn: 1, usedTokens: 15150, windowTokens: 128000, estimatedTokens: 15150, source: 'estimated' as const, zone: 'GREEN' as const };

let projectRoot: string;
beforeEach(async () => { projectRoot = await createProject(); });
afterEach(async () => { await removeProject(projectRoot); });

describe('wrap inside a runner session (TC-16, RF16, CA-12, DEC-19)', () => {
  it('streams the output, appends the block below the threshold, and keeps the exit code', async () => {
    await startRunnerSession(projectRoot, 'claude-code');
    const ledger = await seedToolLine(projectRoot, 'claude-code', GREEN_LINE);
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    expect(output.stdout.join('')).toMatch(/^stdout:3\r?\n\n\[ContextBrake v1\] turn=2\/12 .* zone=GREEN .*\n$/s);
    expect(output.stderr.join('')).toContain('stderr:line');
    expect(await ledger.readLines({ harness: 'claude-code', sessionId: SESSION_ID, agentId: null })).toHaveLength(1);
  });

  it('records one tool line for a harness without post-tool telemetry', async () => {
    await startRunnerSession(projectRoot, 'opencode');
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    const lines = await new NodeSessionLedger(projectRoot, clock).readLines({ harness: 'opencode', sessionId: SESSION_ID, agentId: null });
    expect(lines.filter((line) => line.type === 'tool')).toHaveLength(1);
    expect(output.stdout.join('')).toContain('[ContextBrake v1] turn=1/12');
  });

  it('finds the run from a subdirectory of the project', async () => {
    await startRunnerSession(projectRoot, 'claude-code');
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot: await makeSubdirectory(projectRoot) })).toBe(3);
    expect(output.stdout.join('')).toContain('[ContextBrake v1] turn=1/12');
  });
});

describe('wrap outside a runner session (TC-16, DEC-19)', () => {
  it('passes the output and exit code through, warns, and appends nothing', async () => {
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    expect(output.stdout.join('')).toMatch(/^stdout:3\r?\n$/);
    expect(output.stderr.join('')).toContain('[WARN] context-brake wrap: no active runner session');
  });

  it('treats a run without an active session as outside a runner', async () => {
    await startRunnerSession(projectRoot, 'claude-code');
    process.env['CONTEXT_BRAKE_RUN_ID'] = 'run-unknown';
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    expect(output.stdout.join('')).not.toContain('[ContextBrake v1]');
  });

  it('keeps the exit code and warns when the telemetry cannot be computed', async () => {
    await startRunnerSession(projectRoot, 'claude-code');
    await writeFile(join(projectRoot, 'context-brake.config.json'), '{"schemaVersion": 1,', 'utf8');
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    expect(output.stderr.join('')).toContain('[WARN] context-brake wrap: session telemetry is unavailable');
    expect(output.stdout.join('')).not.toContain('[ContextBrake v1]');
  });
});

describe('wrap when the run record cannot be read (DEC-19)', () => {
  it('still runs the command, keeps its exit code, and warns', async () => {
    await mkdir(join(runDirectory(projectRoot, 'run-dir'), 'run.json'), { recursive: true });
    process.env['CONTEXT_BRAKE_RUN_ID'] = 'run-dir';
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    expect(output.stdout.join('')).toMatch(/^stdout:3\r?\n$/);
    expect(output.stderr.join('')).toContain('[WARN] context-brake wrap: session telemetry is unavailable');
  });
});

describe('wrap in delegated snapshot mode (TC-10, FR-12)', () => {
  it('shows the delegated snapshot action when the section is set and no plan exists (TC-10, FR-12)', async () => {
    await writeFile(join(projectRoot, 'context-brake.config.json'), JSON.stringify(delegatedConfig()), 'utf8');
    await startRunnerSession(projectRoot, 'claude-code');
    for (let turn = 1; turn <= 10; turn += 1) await seedToolLine(projectRoot, 'claude-code', { ...GREEN_LINE, toolUseId: `toolu_${turn}`, turn });
    const output = captureOutput();
    expect(await runWrap(EXIT_THREE, { projectRoot })).toBe(3);
    expect(output.stdout.join('')).toContain('zone=RED action=run "/sdd-snapshot", then end reply with [REQUEST_SESSION_RESET]');
  });
});
