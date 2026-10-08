import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';

async function storedLimit(root: string): Promise<number | undefined> {
  const config = JSON.parse(await readFile(join(root, 'context-brake.config.json'), 'utf8')) as { autoRestart?: { maxConsecutiveRestarts: number } };
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

  it('writes 3, then replaces it with 5 (FR-09, OBJ-04, TC-02)', async () => {
    expect((await runInProcessCli(['init', '--yes', '--auto-restart', '--max-restarts', '3'], root)).code).toBeLessThanOrEqual(1);
    expect(await storedLimit(root)).toBe(3);
    expect((await runInProcessCli(['init', '--yes', '--max-restarts', '5'], root)).code).toBeLessThanOrEqual(1);
    expect(await storedLimit(root)).toBe(5);
  });
  it('keeps the default of 2 without the flag (FR-09, TC-02)', async () => {
    await runInProcessCli(['init', '--yes', '--auto-restart'], root);
    expect(await storedLimit(root)).toBe(2);
  });
  it('rejects an out-of-range value and a limit while restart is off, writing nothing (FR-09, TC-02)', async () => {
    const tooHigh = await runInProcessCli(['init', '--yes', '--auto-restart', '--max-restarts', '11'], root);
    const restartOff = await runInProcessCli(['init', '--yes', '--max-restarts', '3'], root);
    expect([tooHigh.code, restartOff.code]).toEqual([64, 64]);
    expect(restartOff.stderr).toContain('add --auto-restart');
    await expect(readFile(join(root, 'context-brake.config.json'), 'utf8')).rejects.toThrow();
  });
});
