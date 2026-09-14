import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';

describe('E2E minified config install (CR-01, RF6)', () => {
  it('installs Claude against a single-line settings file and stays idempotent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cb-min-e2e-'));
    try {
      await mkdir(join(dir, '.claude'), { recursive: true });
      await writeFile(join(dir, '.claude/settings.json'), '{"hooks":{"UserHook":"node custom.js"}}', 'utf8');
      const first = await runBuiltCli(['init', '--yes'], dir);
      expect(first.code).toBe(0);
      expect(first.stderr).not.toContain('UNEXPECTED_ERROR');
      const settingsPath = join(dir, '.claude/settings.json');
      const afterFirst = await readFile(settingsPath, 'utf8');
      const parsed = JSON.parse(afterFirst) as { hooks: Record<string, unknown> };
      expect(parsed.hooks.UserHook).toBe('node custom.js');
      expect(parsed.hooks.PreToolUse).toBeDefined();
      const second = await runBuiltCli(['init', '--yes'], dir);
      expect(second.code).toBe(0);
      expect(await readFile(settingsPath, 'utf8')).toBe(afterFirst);
    } finally {
      await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
