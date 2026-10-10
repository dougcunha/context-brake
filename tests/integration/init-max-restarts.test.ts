import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const USAGE_EXIT = 64;
const CONFIG_FILE = 'context-brake.config.json';

async function storedLimit(root: string): Promise<number | undefined> {
  const config = JSON.parse(await readFile(join(root, CONFIG_FILE), 'utf8')) as { autoRestart?: { maxConsecutiveRestarts: number } };
  return config.autoRestart?.maxConsecutiveRestarts;
}

describe('FR-09 --max-restarts writes the consecutive-restart limit (prd-16, TC-02)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-p16t01-'));
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('rejects a limit while restart is off, writes 3, replaces it with 5, and rejects 11 keeping 5 (FR-09, OBJ-04, TC-02)', async () => {
    const restartOff = await runInProcessCli(['init', '--yes', '--max-restarts', '3'], root);
    expect([restartOff.code, restartOff.stderr.includes('add --auto-restart')]).toEqual([USAGE_EXIT, true]);
    await expect(readFile(join(root, CONFIG_FILE), 'utf8')).rejects.toThrow();
    expect((await runInProcessCli(['init', '--yes', '--auto-restart', '--max-restarts', '3'], root)).code).toBeLessThanOrEqual(1);
    expect(await storedLimit(root)).toBe(3);
    expect((await runInProcessCli(['init', '--yes', '--max-restarts', '5'], root)).code).toBeLessThanOrEqual(1);
    expect(await storedLimit(root)).toBe(5);
    expect((await runInProcessCli(['init', '--yes', '--max-restarts', '11'], root)).code).toBe(USAGE_EXIT);
    expect(await storedLimit(root)).toBe(5);
  });
});
