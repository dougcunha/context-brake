import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { InvalidConfigurationError } from '../../src/core/validation/configuration-validator.js';
import { ProjectConfigStore } from '../../src/infrastructure/storage/project-config-store.js';

async function withConfigFile(content: string, check: (file: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'context-brake-'));
  try {
    const file = join(directory, 'context-brake.config.json');
    await writeFile(file, content, 'utf8');
    await check(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe('project config store (RF16)', () => {
  it('reads and validates a project configuration asynchronously', async () => {
    await withConfigFile(JSON.stringify(DEFAULT_CONFIG), async (file) => {
      await expect(new ProjectConfigStore(file).read()).resolves.toEqual(DEFAULT_CONFIG);
    });
  });

  it.each([
    { name: 'a schema error', content: JSON.stringify({ ...DEFAULT_CONFIG, schemaVersion: 2 }), issue: { path: 'schemaVersion' } },
    { name: 'malformed JSON', content: '{', issue: { path: '(syntax)', received: '{', rule: 'must be valid JSON' } },
  ])('rejects $name with the file path and the issue', async ({ content, issue }) => {
    await withConfigFile(content, async (file) => {
      const read = new ProjectConfigStore(file).read();
      await expect(read).rejects.toBeInstanceOf(InvalidConfigurationError);
      await expect(read).rejects.toMatchObject({ filePath: file, issues: [expect.objectContaining(issue)] });
    });
  });
});
