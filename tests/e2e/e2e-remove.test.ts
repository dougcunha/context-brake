import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

const USER_SETTINGS = '{\n  "hooks": {}\n}\n';
const OWNED_FILES = ['context-brake.config.json', '.context-brake/manifest.json', '.claude/hooks/context-brake.mjs'];
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-smoke-remove-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), USER_SETTINGS, 'utf8');
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function exists(path: string): Promise<boolean> {
  return stat(join(root, path)).then(() => true, () => false);
}

describe('built CLI remove smoke (prd-13 FR-04, DEC-03)', () => {
  it('deletes the owned files and restores the harness settings', async () => {
    expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);
    expect((await runBuiltCli(['remove', '--yes'], root)).code).toBe(0);
    expect(await Promise.all(OWNED_FILES.map(exists))).toEqual(OWNED_FILES.map(() => false));
    const settings = JSON.parse(await readFile(join(root, '.claude/settings.json'), 'utf8')) as { hooks?: Record<string, unknown> };
    expect(settings.hooks?.['PostToolUse']).toBeUndefined();
  });
});
