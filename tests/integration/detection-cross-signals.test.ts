import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

async function projectHarnesses(projectRoot: string, userHome?: string): Promise<string[]> {
  const detected: string[] = [];
  for (const adapter of getAllAdapters()) {
    const evidence = await adapter.detect({ projectRoot, ...(userHome === undefined ? {} : { userHome }) });
    if (evidence.some((item) => item.origin === 'project')) detected.push(adapter.id);
  }
  return detected;
}

describe('IT-16: project evidence comes only from authentic project signals (RF1, CA-02, CA-03)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-it16-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true }); });

  it('reports no project evidence for a generic .agents directory, AGENTS.md, or a user home configuration', async () => {
    const userHome = join(tempDir, 'fake-home');
    await mkdir(join(tempDir, '.agents/rules'), { recursive: true });
    await writeFile(join(tempDir, 'AGENTS.md'), '# Generic instructions\n', 'utf8');
    await mkdir(join(userHome, '.claude'), { recursive: true });
    await writeFile(join(userHome, '.claude/settings.json'), '{}', 'utf8');
    expect(await projectHarnesses(tempDir, userHome)).toEqual([]);
  });

  it('detects each harness independently from its authentic evidence', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, 'CLAUDE.md'), '# Claude\n', 'utf8');
    expect(await projectHarnesses(tempDir)).toEqual(['claude-code']);
  });
});
