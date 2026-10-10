import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import {
  parseAndValidateTag,
  resolveTargetTag,
  verifyReleaseTag,
} from '../../scripts/check-release-tag.js';

describe('resolveTargetTag (prd-05 FR-03)', () => {
  it.each([
    { source: '--tag <value> over the environment', argv: ['--verbose', '--tag', 'v1.0.0'], env: { GITHUB_REF_NAME: 'v9.9.9' }, tag: 'v1.0.0' },
    { source: '--tag=<value>', argv: ['--tag=v2.1.0'], env: {}, tag: 'v2.1.0' },
    { source: 'GITHUB_REF_NAME before TAG_NAME (TC-04)', argv: [], env: { GITHUB_REF_NAME: 'v2.0.0-rc.1', TAG_NAME: 'v1.5.0' }, tag: 'v2.0.0-rc.1' },
    { source: 'TAG_NAME', argv: [], env: { TAG_NAME: 'v1.5.0' }, tag: 'v1.5.0' },
    { source: 'nowhere as an empty string', argv: [], env: {}, tag: '' },
  ])('resolves the tag from $source', ({ argv, env, tag }) => {
    expect(resolveTargetTag(argv, env)).toBe(tag);
  });
});

describe('parseAndValidateTag (prd-05 FR-03)', () => {
  it('returns the version of a v-prefixed SemVer tag, prerelease included (TC-04)', () => {
    expect(parseAndValidateTag('v1.0.0')).toBe('1.0.0');
    expect(parseAndValidateTag('v2.0.0-rc.1')).toBe('2.0.0-rc.1');
  });

  it.each([
    ['   ', /No release tag specified/],
    ['1.0.0', /Tag must start with 'v'/],
    ['vnot-semver', /not valid SemVer/],
  ])('rejects %j (TC-03)', (tag, message) => {
    expect(() => parseAndValidateTag(tag)).toThrow(message);
  });
});

async function withTempPackage(pkg: object, run: (pkgPath: string) => Promise<void>): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cb-tag-test-'));
  const pkgPath = path.join(tempDir, 'package.json');
  try {
    await writeFile(pkgPath, JSON.stringify(pkg), 'utf8');
    await run(pkgPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

describe('verifyReleaseTag (prd-05 FR-03)', () => {
  it('returns the tag and version when the tag matches package.json (TC-01)', async () => {
    await withTempPackage({ version: '1.2.3' }, async (pkgPath) => {
      const result = await verifyReleaseTag({ tag: 'v1.2.3', packageJsonPath: pkgPath });
      expect(result).toEqual({ tag: 'v1.2.3', version: '1.2.3' });
    });
  });

  it.each([
    { case: 'a different version (TC-02)', pkg: { version: '1.2.3' }, tag: 'v1.2.4', message: /does not match package.json version/ },
    { case: 'no version field', pkg: { name: 'test' }, tag: 'v1.0.0', message: /does not have a valid "version" field/ },
  ])('rejects a package.json with $case', async ({ pkg, tag, message }) => {
    await withTempPackage(pkg, async (pkgPath) => {
      await expect(verifyReleaseTag({ tag, packageJsonPath: pkgPath })).rejects.toThrow(message);
    });
  });
});
