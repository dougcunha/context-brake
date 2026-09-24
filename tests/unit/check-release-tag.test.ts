import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import {
  parseAndValidateTag,
  resolveTargetTag,
  verifyReleaseTag,
} from '../../scripts/check-release-tag.js';

describe('resolveTargetTag', () => {
  it('resolves tag from --tag <value> argument', () => {
    const tag = resolveTargetTag(['--verbose', '--tag', 'v1.0.0'], {});
    expect(tag).toBe('v1.0.0');
  });

  it('resolves tag from --tag=<value> argument', () => {
    const tag = resolveTargetTag(['--tag=v2.1.0'], {});
    expect(tag).toBe('v2.1.0');
  });

  it('falls back to GITHUB_REF_NAME environment variable', () => {
    const tag = resolveTargetTag([], { GITHUB_REF_NAME: 'v3.0.0' });
    expect(tag).toBe('v3.0.0');
  });

  it('falls back to TAG_NAME environment variable if GITHUB_REF_NAME is unset', () => {
    const tag = resolveTargetTag([], { TAG_NAME: 'v1.5.0' });
    expect(tag).toBe('v1.5.0');
  });

  it('returns empty string when no tag is present in argv or env', () => {
    const tag = resolveTargetTag([], {});
    expect(tag).toBe('');
  });
});

describe('parseAndValidateTag valid', () => {
  it('parses valid semver tag with v prefix', () => {
    expect(parseAndValidateTag('v1.0.0')).toBe('1.0.0');
    expect(parseAndValidateTag('v2.3.4-beta.1')).toBe('2.3.4-beta.1');
  });
});

describe('parseAndValidateTag invalid', () => {
  it('throws when tag is empty or whitespace', () => {
    expect(() => parseAndValidateTag('')).toThrow(/No release tag specified/);
    expect(() => parseAndValidateTag('   ')).toThrow(/No release tag specified/);
  });

  it('throws when tag does not start with v', () => {
    expect(() => parseAndValidateTag('1.0.0')).toThrow(/Tag must start with 'v'/);
  });

  it('throws when tag is not valid semver', () => {
    expect(() => parseAndValidateTag('vnot-semver')).toThrow(/not valid SemVer/);
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

describe('verifyReleaseTag match', () => {
  it('succeeds when tag matches package.json version', async () => {
    await withTempPackage({ version: '1.2.3' }, async (pkgPath) => {
      const result = await verifyReleaseTag({ tag: 'v1.2.3', packageJsonPath: pkgPath });
      expect(result).toEqual({ tag: 'v1.2.3', version: '1.2.3' });
    });
  });
});

describe('verifyReleaseTag mismatch', () => {
  it('throws when tag version differs from package.json version', async () => {
    await withTempPackage({ version: '1.2.3' }, async (pkgPath) => {
      await expect(
        verifyReleaseTag({ tag: 'v1.2.4', packageJsonPath: pkgPath })
      ).rejects.toThrow(/does not match package.json version/);
    });
  });

  it('throws when package.json is missing or has invalid version', async () => {
    await withTempPackage({ name: 'test' }, async (pkgPath) => {
      await expect(
        verifyReleaseTag({ tag: 'v1.0.0', packageJsonPath: pkgPath })
      ).rejects.toThrow(/does not have a valid "version" field/);
    });
  });
});
