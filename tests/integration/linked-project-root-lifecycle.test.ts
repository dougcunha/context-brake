import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInProcessCli } from '../helpers/in-process-cli.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

const OWNED_FILES = ['context-brake.config.json', '.context-brake/manifest.json'] as const;

async function setupRepo(dir: string): Promise<string> {
  const real = join(dir, 'real-repo');
  await mkdir(join(real, '.claude'), { recursive: true });
  await writeFile(join(real, 'CLAUDE.md'), '# Claude Guide\n', 'utf8');
  await writeFile(join(real, '.claude/settings.json'), JSON.stringify({ hooks: { UserHook: 'node custom.js' } }), 'utf8');
  return real;
}

async function readOwnedFiles(realRoot: string): Promise<string[]> {
  return Promise.all(OWNED_FILES.map((path) => readFile(join(realRoot, path), 'utf8')));
}

async function assertDoctorAndRemove(linkRoot: string): Promise<void> {
  const doctor = await runInProcessCli(['doctor'], linkRoot);
  expect(doctor.code).toBe(1);
  expect(doctor.stderr).not.toContain('UNEXPECTED_ERROR');
  expect(doctor.stdout).toContain('VERSION_FLOOR_UNVERIFIED');
  const removeDry = await runInProcessCli(['remove', '--dry-run'], linkRoot);
  expect(removeDry.code).toBe(0);
  expect(removeDry.stderr).not.toContain('UNEXPECTED_ERROR');
  expect((await lstat(linkRoot)).isSymbolicLink()).toBe(true);
}

describe('linked project root lifecycle (T11.4, CR-01)', () => {
  let tempParent: string;
  let realRoot: string;
  let linkRoot: string;

  beforeEach(async () => {
    tempParent = await mkdtemp(join(tmpdir(), 'cb-e2e-link-'));
    realRoot = await setupRepo(tempParent);
    linkRoot = join(tempParent, 'link-repo');
  });

  afterEach(async () => {
    await rm(tempParent, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  });

  it('installs through the linked root into the real root, reruns byte-identically, and keeps doctor and remove --dry-run working', async (ctx) => {
    await requireLink(ctx, await attemptLink(realRoot, linkRoot), linkRoot);
    const first = await runInProcessCli(['init', '--yes'], linkRoot);
    expect(first.code).toBe(0);
    expect(first.stderr).not.toContain('RepositoryBoundaryError');
    const firstFiles = await readOwnedFiles(realRoot);
    expect((await runInProcessCli(['init', '--yes'], linkRoot)).code).toBe(0);
    expect(await readOwnedFiles(realRoot)).toEqual(firstFiles);
    await assertDoctorAndRemove(linkRoot);
  });
});
