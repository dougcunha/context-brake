import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';
import { z } from 'zod';

const currentDir = dirname(fileURLToPath(import.meta.url));
const PACKAGE_NAME = 'context-brake';

const packageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
}).passthrough();

export class PackageMetadataError extends Error {
  constructor(readonly issue: string) {
    super(`Unable to read ${PACKAGE_NAME} package metadata: ${issue}`);
    this.name = 'PackageMetadataError';
  }
}

export function packageJsonCandidates(baseDir: string): string[] {
  return [
    resolve(baseDir, '../../../../package.json'),
    resolve(baseDir, '../../../package.json'),
  ];
}

async function readCandidate(candidate: string): Promise<unknown> {
  const raw = await readFile(candidate, 'utf8');
  return JSON.parse(raw) as unknown;
}

async function loadPackageJson(baseDir: string): Promise<unknown> {
  const candidates = packageJsonCandidates(baseDir);
  for (const candidate of candidates) {
    try {
      return await readCandidate(candidate);
    } catch {
      continue;
    }
  }
  throw new PackageMetadataError(`no package.json found among candidate paths: ${candidates.join(', ')}`);
}

export async function readPackageVersionFrom(baseDir: string): Promise<string> {
  const raw = await loadPackageJson(baseDir);
  const parsed = packageJsonSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PackageMetadataError(`package.json does not match the expected shape: ${parsed.error.message}`);
  }
  if (parsed.data.name !== PACKAGE_NAME) {
    throw new PackageMetadataError(`package.json 'name' is '${parsed.data.name}', expected '${PACKAGE_NAME}'`);
  }
  if (!semver.valid(parsed.data.version)) {
    throw new PackageMetadataError(`package.json 'version' is not valid semver: '${parsed.data.version}'`);
  }
  return parsed.data.version;
}

export function readPackageVersion(): Promise<string> {
  return readPackageVersionFrom(currentDir);
}
