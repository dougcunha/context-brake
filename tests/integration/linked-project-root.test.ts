import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dispatchCommand } from '../../src/cli/composition-root.js';
import type { ParsedInitArgs } from '../../src/cli/argument-parser.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';
import { fakeProcessRunner } from '../helpers/fake-process-runner.js';

type LinkContext = Parameters<typeof requireLink>[0];

const initArgs: ParsedInitArgs = {
  command: 'init', dryRun: false, yes: true, json: true,
  harness: [], excludeHarness: [], };

async function runWithLinkedRepo(fn: (realRoot: string, linkRoot: string) => Promise<void>): Promise<void> {
  const temp = await mkdtemp(join(tmpdir(), 'cb-int-link-'));
  try {
    const realRoot = join(temp, 'real-repo');
    await mkdir(join(realRoot, '.claude'), { recursive: true });
    await writeFile(join(realRoot, 'CLAUDE.md'), '# Claude Guide\n', 'utf8');
    await writeFile(join(realRoot, '.claude/settings.json'), JSON.stringify({ hooks: { UserHook: 'node custom.js' } }), 'utf8');
    await fn(realRoot, join(temp, 'link-repo'));
  } finally {
    await rm(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  }
}

async function linkOwnedPaths(ctx: LinkContext, realRoot: string): Promise<void> {
  const realConfig = join(realRoot, 'real-config.json');
  await writeFile(realConfig, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf8');
  const configLink = join(realRoot, 'context-brake.config.json');
  await requireLink(ctx, await attemptLink(realConfig, configLink, 'file'), configLink);
  await mkdir(join(realRoot, 'real-cb'), { recursive: true });
  const stateLink = join(realRoot, '.context-brake');
  await requireLink(ctx, await attemptLink(join(realRoot, 'real-cb'), stateLink), stateLink);
}

async function readLinkTargets(realRoot: string): Promise<string[]> {
  return Promise.all([readFile(join(realRoot, 'real-config.json'), 'utf8'), readFile(join(realRoot, 'real-cb/manifest.json'), 'utf8')]);
}

describe('symlinked config and linked state directory in a linked root (T11.4)', () => {
  it('writes through both links, keeps them as links, and reruns byte-identically', async (ctx) => {
    await runWithLinkedRepo(async (realRoot, linkRoot) => {
      await linkOwnedPaths(ctx, realRoot);
      await requireLink(ctx, await attemptLink(realRoot, linkRoot), linkRoot);
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot, runner: fakeProcessRunner })).toBe(0);
      expect((await lstat(join(realRoot, 'context-brake.config.json'))).isSymbolicLink()).toBe(true);
      expect((await lstat(join(realRoot, '.context-brake'))).isSymbolicLink()).toBe(true);
      const firstTargets = await readLinkTargets(realRoot);
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot, runner: fakeProcessRunner })).toBe(0);
      expect(await readLinkTargets(realRoot)).toEqual(firstTargets);
    });
  });
});
