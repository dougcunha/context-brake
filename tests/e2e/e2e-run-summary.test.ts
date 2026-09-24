import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runSessionLineSchema } from '../../src/core/contracts/run-records.js';
import { runSummarySchema } from '../../src/core/contracts/run-summary.js';
import { runBuiltCli } from './cli-runner.js';
import { createRunProject, MARKER_COMMAND, PASSING_COMMAND, readPlanStatuses, removeRunProject, runEnvironment, useScenario, writePlan, type RunProject } from '../helpers/run-project.js';

const RUNS_DIRECTORY = join('.context-brake', 'runtime', 'runner', 'runs');
const SESSION_FIELDS = ['durationMs', 'endReason', 'stepId', 'streamParseErrors', 'validation', 'bootTokens', 'sessionTokens'];

let world: RunProject;
beforeEach(async () => {
  world = await createRunProject('cb-e2e-run-summary-');
  await writePlan(world, [{ title: 'Add parser', validationCommand: PASSING_COMMAND }, { title: 'Wire output', validationCommand: MARKER_COMMAND }]);
});
afterEach(async () => { await removeRunProject(world); });

async function sessionLines(runId: string): Promise<unknown[]> {
  const source = await readFile(join(world.project, RUNS_DIRECTORY, runId, 'sessions.jsonl'), 'utf8');
  return source.trim().split('\n').map((line) => JSON.parse(line) as unknown);
}

describe('E2E run: JSON summary and session records (TC-18, RF17, RF18, CA-13, DEC-15)', () => {
  it('prints one schema-valid document on stdout and keeps progress on stderr', async () => {
    const result = await runBuiltCli(['run', '--harness', 'claude-code', '--approve-commands', '--json'], world.project, await runEnvironment(world));
    expect(result.code).toBe(0);
    const summary = runSummarySchema.parse(JSON.parse(result.stdout));
    const published = JSON.parse(await readFile(resolve('schemas', 'run-summary.schema.json'), 'utf8')) as { required: string[] };
    expect(Object.keys(summary)).toEqual(expect.arrayContaining(published.required));
    expect(summary).toMatchObject({ status: 'completed', stopReason: 'completed', exitCode: 0, stepsCompleted: 2, stepsTotal: 2, sessionCount: 2 });
    expect(summary.sessions.map((session) => session.streamParseErrors)).toEqual([0, 0]);
    expect(result.stderr).toMatch(/^Session 1 \| step 1 "Add parser" \| end reset_signal \| zone n\/a \| validation PASS \| \d+s$/m);
    expect(result.stderr).toMatch(/^Session 2 \| step 2 "Wire output" \| end reset_signal \| zone \S+ \| validation PASS \| \d+s$/m);
    expect(result.stdout).not.toContain('Session 1 |');
    expect(await readPlanStatuses(world)).toEqual(['COMPLETED', 'COMPLETED']);
  });
});

describe('E2E run: session records (TC-18, RF17, CA-13, DEC-14)', () => {
  it('records every session with duration, end reason, step, validation, and tokens with their source', async () => {
    await useScenario(world, { noise: ['not-json', '{broken'] });
    const result = await runBuiltCli(['run', '--harness', 'codex-cli', '--approve-commands', '--json'], world.project, await runEnvironment(world));
    const summary = runSummarySchema.parse(JSON.parse(result.stdout));
    const lines = await sessionLines(summary.runId ?? '');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      const parsed = runSessionLineSchema.parse(line);
      expect(Object.keys(parsed)).toEqual(expect.arrayContaining(SESSION_FIELDS));
      expect(parsed.sessionTokens).toEqual({ value: 1000, source: 'measured' });
      expect(parsed.bootTokens.source).toBe('estimated');
      expect(parsed.validation).toMatchObject({ status: 'passed', exitCode: 0 });
      expect(parsed.streamParseErrors).toBe(2);
    }
    expect(summary.sessions).toEqual(lines);
    expect(await readdir(join(world.project, RUNS_DIRECTORY))).toEqual([summary.runId]);
  });
});

describe('E2E run: text summary (TC-18, RF18, PRD user experience)', () => {
  it('prints a labeled text summary on stdout without --json', async () => {
    const result = await runBuiltCli(['run', '--harness', 'claude-code', '--approve-commands'], world.project, await runEnvironment(world));
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^\[OK\] ContextBrake run: completed \(completed\)$/m);
    expect(result.stdout).toContain('  Steps completed: 2/2');
    expect(result.stdout).toContain('  Tokens: 2000 (measured)');
    expect(result.stdout).not.toContain('\u001b[');
  });
});
