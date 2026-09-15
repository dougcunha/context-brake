import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeToolPath } from '../../src/infrastructure/runtime/tool-path-normalizer.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

describe('tool path normalization (DEC-08, CMP-16, acceptance)', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'cb-t04-path-'));
    await mkdir(join(root, 'src'), { recursive: true });
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('normalizes relative and absolute paths into project-relative POSIX paths', async () => {
    expect(await normalizeToolPath(root, 'src/app.ts')).toBe('src/app.ts');
    expect(await normalizeToolPath(root, './src/app.ts')).toBe('src/app.ts');
    expect(await normalizeToolPath(root, join(root, 'src', 'app.ts'))).toBe('src/app.ts');
    expect(await normalizeToolPath(root, join(root, 'state_checkpoint.json'))).toBe('state_checkpoint.json');
  });
  it('keeps a path outside the project root as a relative escape', async () => {
    expect(await normalizeToolPath(root, join(tmpdir(), 'cb-t04-outside.ts'))).toMatch(/^\.\.\//);
  });
  it('resolves a symlinked parent directory to its target', async (ctx) => {
    await requireLink(ctx, await attemptLink(join(root, 'src'), join(root, 'link')), join(root, 'link'));
    expect(await normalizeToolPath(root, join(root, 'link', 'app.ts'))).toBe('src/app.ts');
  });
});
