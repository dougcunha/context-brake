import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';

const CONFIG_FILE = 'context-brake.config.json';

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true).catch(() => false);
}

describe('FR-05 exclusion edges (prd-15, TC-15)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t05-edge-'));
    await mkdir(join(root, '.claude'), { recursive: true });
    await writeFile(join(root, '.claude/settings.json'), '{\n}\n', 'utf8');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('persists the exclusion of the only detected harness on a first run (FR-05, TC-15)', async () => {
    const result = await runInProcessCli(['init', '--yes', '--exclude-harness', 'claude-code'], root);
    expect(result.code).toBe(0);
    const config = JSON.parse(await readFile(join(root, CONFIG_FILE), 'utf8')) as { activeHarnesses: string[]; excludedHarnesses: string[] };
    expect(config.activeHarnesses).toEqual([]);
    expect(config.excludedHarnesses).toEqual(['claude-code']);
    expect(await exists(join(root, '.claude/hooks/context-brake.mjs'))).toBe(false);
    expect(await exists(join(root, '.context-brake/manifest.json'))).toBe(false);
  });
  it('still writes nothing else when nothing changes on the next plain run (FR-06, NFR-01, TC-15)', async () => {
    await runInProcessCli(['init', '--yes', '--exclude-harness', 'claude-code'], root);
    const before = await readFile(join(root, CONFIG_FILE), 'utf8');
    await runInProcessCli(['init', '--yes'], root);
    expect(await readFile(join(root, CONFIG_FILE), 'utf8')).toBe(before);
    expect(await exists(join(root, '.claude/hooks/context-brake.mjs'))).toBe(false);
  });
});
