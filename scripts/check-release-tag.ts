import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

export type TagVerifyOptions = {
  tag?: string;
  packageJsonPath?: string;
};

export type TagVerifyResult = {
  tag: string;
  version: string;
};

export function resolveTargetTag(argv: readonly string[], env: NodeJS.ProcessEnv): string {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tag' && argv[i + 1]) {
      return argv[i + 1]!;
    }
    if (argv[i]?.startsWith('--tag=')) {
      return argv[i]!.slice('--tag='.length);
    }
  }
  return env.GITHUB_REF_NAME ?? env.TAG_NAME ?? '';
}

export function parseAndValidateTag(rawTag: string): string {
  const trimmed = rawTag.trim();
  if (!trimmed) {
    throw new Error('No release tag specified. Provide --tag <tag> or set GITHUB_REF_NAME / TAG_NAME.');
  }
  if (!trimmed.startsWith('v')) {
    throw new Error(`Tag must start with 'v' followed by SemVer (received: "${trimmed}").`);
  }
  const version = trimmed.slice(1);
  if (!semver.valid(version)) {
    throw new Error(`Tag version "${version}" is not valid SemVer.`);
  }
  return version;
}

export async function verifyReleaseTag(options: TagVerifyOptions = {}): Promise<TagVerifyResult> {
  const targetTag = options.tag ?? resolveTargetTag(process.argv.slice(2), process.env);
  const version = parseAndValidateTag(targetTag);
  const pkgPath = options.packageJsonPath ?? path.resolve('package.json');
  const content = await readFile(pkgPath, 'utf8');
  const manifest = JSON.parse(content) as { version?: string };
  if (typeof manifest.version !== 'string' || !manifest.version) {
    throw new Error(`package.json at ${pkgPath} does not have a valid "version" field.`);
  }
  if (version !== manifest.version) {
    throw new Error(
      `Tag version "${version}" does not match package.json version "${manifest.version}".`
    );
  }
  return { tag: targetTag, version };
}

async function runCli(): Promise<void> {
  try {
    const result = await verifyReleaseTag();
    process.stdout.write(`Verified release tag ${result.tag} matches package.json version ${result.version}.\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Release tag verification failed: ${message}\n`);
    process.exit(1);
  }
}

const isDirect = Boolean(
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
);
if (isDirect) {
  await runCli();
}
