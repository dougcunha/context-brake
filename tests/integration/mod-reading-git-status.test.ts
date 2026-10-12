import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contextReadingRelativePath } from '../../src/core/contracts/context-reading.js';
import { createHost, createHostState } from '../fixtures/claude-mod-host.js';
import { publishContextReading } from '../../src/infrastructure/harnesses/claude-code/mod/context-reading.js';
import { runnerReporting } from '../helpers/claude-version-runner.js';
import { createStatuslineWorld, removeStatuslineWorld, runJson, type StatuslineWorld } from '../helpers/statusline-world.js';

const run = promisify(execFile);
let world: StatuslineWorld;

async function untracked(): Promise<string> {
  return (await run('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: world.root })).stdout;
}

beforeEach(async () => { world = await createStatuslineWorld(); await run('git', ['init', '-q'], { cwd: world.root }); });
afterEach(async () => { await removeStatuslineWorld(world); });

describe('the mod reading file stays out of Git (TechSpec risk, CR-02)', () => {
  it('shows no reading file in git status after init and a publish', async () => {
    await runJson(world, ['init', '--yes', '--json'], { runner: runnerReporting('2.1.296') });
    await publishContextReading(createHost(world.root, createHostState(Date.now())));
    const files = (await untracked()).split('\n');
    expect(files.some((line) => line.includes(contextReadingRelativePath('claude-code', 'session-1')))).toBe(false);
    expect(files.some((line) => line.includes('context-readings'))).toBe(false);
  });
});
