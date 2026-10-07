import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

const OWNED_FILES = ['.claude/settings.json', 'context-brake.config.json', '.context-brake/manifest.json', '.claude/hooks/context-brake.mjs'];
let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cb-smoke-init-'));
  await mkdir(join(root, '.claude'), { recursive: true });
  await writeFile(join(root, '.claude/settings.json'), '{\n  "hooks": {}\n}\n', 'utf8');
});
afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

async function readOwned(): Promise<string[]> {
  return Promise.all(OWNED_FILES.map((path) => readFile(join(root, path), 'utf8')));
}

describe('built CLI init smoke (prd-13 FR-04, DEC-03)', () => {
  it('installs Claude Code non-interactively and changes nothing on a second run', async () => {
    const first = await runBuiltCli(['init', '--yes'], root);
    expect(first.code).toBe(0);
    expect(first.stdout).toContain('claude-code: full support');
    const settings = JSON.parse(await readFile(join(root, '.claude/settings.json'), 'utf8')) as { hooks: Record<string, unknown> };
    expect(Object.keys(settings.hooks)).toContain('PostToolUse');
    const installed = await readOwned();
    expect((await runBuiltCli(['init', '--yes'], root)).code).toBe(0);
    expect(await readOwned()).toEqual(installed);
  });
});
