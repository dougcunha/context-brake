import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NOT_INTERACTIVE_MESSAGE } from '../../src/cli/terminal.js';
import { TERMINAL, useProject } from '../helpers/assistant-world.js';
import { runInProcessCli, runInProcessCliWith } from '../helpers/in-process-cli.js';
import { ScriptedPrompts } from '../helpers/scripted-prompts.js';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

describe('FR-01 and FR-08 the --interactive gate and the unchanged non-TTY run (prd-16, TC-05)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-p16t02-'));
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('refuses --interactive without a terminal, names the flags, and writes nothing (FR-01, FR-10, TC-05)', async () => {
    const result = await runInProcessCli(['init', '--interactive'], root);
    expect(result.code).toBe(64);
    expect(result.stderr).toContain(NOT_INTERACTIVE_MESSAGE);
    expect(await exists(join(root, 'context-brake.config.json'))).toBe(false);
  });
  it('still fails with CONFIRMATION_REQUIRED on a non-TTY run without --yes (FR-08, TC-05)', async () => {
    const result = await runInProcessCli(['init', '--json'], root);
    expect(result.code).toBe(2);
    expect(result.stdout).toContain('CONFIRMATION_REQUIRED');
  });
});

describe('FR-01, FR-08, NFR-02 flags keep the assistant away on a terminal (prd-16, TC-12)', () => {
  const project = useProject();

  it.each([
    [['--yes']],
    [['--dry-run', '--json']],
    [['--dry-run', '--debug']],
    [['--dry-run', '--harness', 'claude-code']],
    [['--dry-run', '--max-restarts', '3', '--auto-restart']],
  ])('never prompts or prints the summary when %j is given (TC-12)', async (args) => {
    const prompts = new ScriptedPrompts([]);
    const result = await runInProcessCliWith(['init', ...args], { cwd: project(), overrides: { terminal: TERMINAL, prompts } });
    expect(result.code).toBeLessThanOrEqual(1);
    expect(prompts.asked).toEqual([]);
    expect(result.stdout).not.toContain('Equivalent command');
    if (args.includes('--json')) expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});
