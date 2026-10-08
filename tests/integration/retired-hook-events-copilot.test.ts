import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';

describe('FR-03 and FR-04 retired events for GitHub Copilot CLI (prd-15, TC-08)', () => {
  const file = '.github/hooks/context-brake.json';
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t04-copilot-'));
    await mkdir(join(root, '.github/hooks'), { recursive: true });
    const retired = { version: 1, hooks: { preToolUse: [{ type: 'command', exec: 'node', args: ['.github/hooks/context-brake.mjs', 'preToolUse'], cwd: '.' }] } };
    await writeFile(join(root, file), `${JSON.stringify(retired, null, 2)}\n`, 'utf8');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('init rewrites the file without the retired event and remove deletes it (FR-03, FR-04, TC-08)', async () => {
    expect((await runInProcessCli(['init', '--yes', '--harness', 'github-copilot-cli'], root)).code).toBeLessThanOrEqual(1);
    const hooks = (JSON.parse(await readFile(join(root, file), 'utf8')) as { hooks: Record<string, unknown> }).hooks;
    expect(Object.keys(hooks).sort()).toEqual(['postToolUse', 'preCompact', 'sessionStart']);
    expect((await runInProcessCli(['remove', '--yes'], root)).code).toBe(0);
    expect(await stat(join(root, file)).then(() => true).catch(() => false)).toBe(false);
  });
});
