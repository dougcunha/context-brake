import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAllAdapters } from '../../src/infrastructure/harnesses/registry.js';

describe('IT-16: avoids false positives on generic files (CA-02, CA-03)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-it16-a-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('avoids false positive on generic .agents directory and AGENTS.md', async () => {
    await mkdir(join(tempDir, '.agents/rules'), { recursive: true });
    await writeFile(join(tempDir, 'AGENTS.md'), '# Generic instructions\n', 'utf8');
    const isolatedHome = join(tempDir, 'empty-home');
    for (const adapter of getAllAdapters()) {
      const evidence = await adapter.detect({ projectRoot: tempDir, userHome: isolatedHome });
      expect(evidence.filter((e) => e.origin === 'project')).toHaveLength(0);
    }
  });
});

describe('IT-16: isolates authentic project vs machine evidence (CA-02, CA-03)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cb-it16-b-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('detects each harness independently from its authentic evidence', async () => {
    await mkdir(join(tempDir, '.claude'), { recursive: true });
    await writeFile(join(tempDir, 'CLAUDE.md'), '# Claude\n', 'utf8');
    const detected: string[] = [];
    for (const a of getAllAdapters()) {
      const ev = await a.detect({ projectRoot: tempDir });
      if (ev.some((e) => e.origin === 'project')) detected.push(a.id);
    }
    expect(detected).toEqual(['claude-code']);
  });

  it('classifies user home configurations as machine evidence, not project', async () => {
    const userHome = join(tempDir, 'fake-home');
    await mkdir(join(userHome, '.claude'), { recursive: true });
    await writeFile(join(userHome, '.claude/settings.json'), '{}', 'utf8');
    for (const a of getAllAdapters()) {
      const ev = await a.detect({ projectRoot: tempDir, userHome });
      expect(ev.some((e) => e.origin === 'project')).toBe(false);
    }
  });
});
