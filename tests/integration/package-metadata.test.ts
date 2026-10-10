import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PackageMetadataError, readPackageVersionFrom } from '../../src/infrastructure/storage/package-metadata.js';

async function writePackageJson(root: string, content: unknown): Promise<void> {
  await writeFile(join(root, 'package.json'), JSON.stringify(content), 'utf8');
}

describe('readPackageVersionFrom resolves the running version (FR-07, TC-02)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-pkgmeta-ok-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('resolves the version from the dist layout (four levels up)', async () => {
    await writePackageJson(root, { name: 'context-brake', version: '2.3.4' });
    const distBase = join(root, 'dist/src/infrastructure/storage');
    await mkdir(distBase, { recursive: true });
    await expect(readPackageVersionFrom(distBase)).resolves.toBe('2.3.4');
  });

  it('resolves the version from the source layout (three levels up)', async () => {
    await writePackageJson(root, { name: 'context-brake', version: '1.9.0' });
    const srcBase = join(root, 'src/infrastructure/storage');
    await mkdir(srcBase, { recursive: true });
    await expect(readPackageVersionFrom(srcBase)).resolves.toBe('1.9.0');
  });
});

describe('readPackageVersionFrom rejects invalid metadata (FR-07, TC-02)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-pkgmeta-err-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('throws PackageMetadataError when no package.json resolves', async () => {
    const base = join(root, 'src/infrastructure/storage');
    await mkdir(base, { recursive: true });
    await expect(readPackageVersionFrom(base)).rejects.toBeInstanceOf(PackageMetadataError);
  });

  it('throws PackageMetadataError when the version is not valid semver', async () => {
    await writePackageJson(root, { name: 'context-brake', version: 'not-a-version' });
    const base = join(root, 'src/infrastructure/storage');
    await mkdir(base, { recursive: true });
    await expect(readPackageVersionFrom(base)).rejects.toBeInstanceOf(PackageMetadataError);
  });

  it('throws PackageMetadataError when the package name does not match', async () => {
    await writePackageJson(root, { name: 'some-other-package', version: '1.0.0' });
    const base = join(root, 'src/infrastructure/storage');
    await mkdir(base, { recursive: true });
    await expect(readPackageVersionFrom(base)).rejects.toBeInstanceOf(PackageMetadataError);
  });
});
