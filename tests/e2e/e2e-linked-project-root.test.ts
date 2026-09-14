import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runBuiltCli } from './cli-runner.js';
import { attemptLink, linkExists, requireLink } from '../helpers/link-capability.js';

async function setupRepo(dir: string): Promise<string> {
  const real = join(dir, 'real-repo');
  await mkdir(join(real, '.claude'), { recursive: true });
  await writeFile(join(real, 'CLAUDE.md'), '# Claude Guide\n', 'utf8');
  await writeFile(join(real, '.claude/settings.json'), JSON.stringify({ hooks: { UserHook: 'node custom.js' } }), 'utf8');
  return real;
}

async function assertDoctorAndRemove(linkRoot: string): Promise<void> {
  const doctor = await runBuiltCli(['doctor'], linkRoot);
  expect(doctor.code).toBe(1);
  expect(doctor.stderr).not.toContain('UNEXPECTED_ERROR');
  expect(doctor.stdout).toContain('warnings');
  expect(doctor.stdout).toContain('VERSION_FLOOR_UNVERIFIED');
  const removeDry = await runBuiltCli(['remove', '--dry-run'], linkRoot);
  expect(removeDry.code).toBe(0);
  expect(removeDry.stderr).not.toContain('UNEXPECTED_ERROR');
  expect((await lstat(linkRoot)).isSymbolicLink()).toBe(true);
}

describe('E2E linked project root lifecycle (T11.4, CR-01)', () => {
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

  it('runs init --yes twice, doctor, and remove --dry-run on linked root fixture', async (ctx) => {
    await requireLink(ctx, await attemptLink(realRoot, linkRoot), linkRoot);
    expect(await linkExists(linkRoot)).toBe(true);
    const first = await runBuiltCli(['init', '--yes'], linkRoot);
    expect(first.code).toBe(0);
    expect(first.stderr).not.toContain('UNEXPECTED_ERROR');
    expect(first.stderr).not.toContain('RepositoryBoundaryError');
    const configPath = join(realRoot, 'context-brake.config.json');
    const firstConfig = await readFile(configPath, 'utf8');
    const second = await runBuiltCli(['init', '--yes'], linkRoot);
    expect(second.code).toBe(0);
    expect(await readFile(configPath, 'utf8')).toBe(firstConfig);
    await assertDoctorAndRemove(linkRoot);
  });
});
