import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dispatchCommand } from '../../src/cli/composition-root.js';
import type { ParsedInitArgs } from '../../src/cli/argument-parser.js';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { normalizeSeparators } from '../../src/infrastructure/storage/path-boundary.js';
import { snapshotFiles } from '../../src/infrastructure/storage/node-file-system.js';
import { attemptLink, linkExists, requireLink } from '../helpers/link-capability.js';

const initArgs: ParsedInitArgs = {
  command: 'init', dryRun: false, yes: true, json: true,
  harness: [], excludeHarness: [], instructionFile: [],
  createInstructions: false, migrateLegacy: false,
};

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

describe('linked project root installation and idempotency (T11.4)', () => {
  it('installs through linked root with canonical paths and rerun is byte-idempotent', async (ctx) => {
    await runWithLinkedRepo(async (realRoot, linkRoot) => {
      await requireLink(ctx, await attemptLink(realRoot, linkRoot), linkRoot);
      expect(await linkExists(linkRoot)).toBe(true);
      const canonical = normalizeSeparators(await realpath(realRoot));
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot })).toBe(0);
      const snaps = await snapshotFiles(linkRoot, ['context-brake.config.json', '.context-brake/manifest.json']);
      expect(snaps[0].realPath).toBe(`${canonical}/context-brake.config.json`);
      expect(snaps[1].realPath).toBe(`${canonical}/.context-brake/manifest.json`);
      const firstContent = await readFile(join(realRoot, 'context-brake.config.json'), 'utf8');
      const firstManifest = await readFile(join(realRoot, '.context-brake/manifest.json'), 'utf8');
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot })).toBe(0);
      expect(await readFile(join(realRoot, 'context-brake.config.json'), 'utf8')).toBe(firstContent);
      expect(await readFile(join(realRoot, '.context-brake/manifest.json'), 'utf8')).toBe(firstManifest);
    });
  });
});

describe('symlinked config and linked manifest in linked root (T11.4)', () => {
  it('installs with symlinked context-brake.config.json and remains idempotent', async (ctx) => {
    await runWithLinkedRepo(async (realRoot, linkRoot) => {
      const realTarget = join(realRoot, 'real-config.json');
      await writeFile(realTarget, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf8');
      const configLink = join(realRoot, 'context-brake.config.json');
      await requireLink(ctx, await attemptLink(realTarget, configLink, 'file'), configLink);
      await requireLink(ctx, await attemptLink(realRoot, linkRoot), linkRoot);
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot })).toBe(0);
      expect((await lstat(join(realRoot, 'context-brake.config.json'))).isSymbolicLink()).toBe(true);
      const content1 = await readFile(realTarget, 'utf8');
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot })).toBe(0);
      expect(await readFile(realTarget, 'utf8')).toBe(content1);
    });
  });

  it('installs with linked .context-brake directory and remains idempotent', async (ctx) => {
    await runWithLinkedRepo(async (realRoot, linkRoot) => {
      const realCb = join(realRoot, 'real-cb');
      await mkdir(realCb, { recursive: true });
      await requireLink(ctx, await attemptLink(realCb, join(realRoot, '.context-brake')), join(realRoot, '.context-brake'));
      await requireLink(ctx, await attemptLink(realRoot, linkRoot), linkRoot);
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot })).toBe(0);
      expect((await lstat(join(realRoot, '.context-brake'))).isSymbolicLink()).toBe(true);
      const manifest1 = await readFile(join(realCb, 'manifest.json'), 'utf8');
      expect(await dispatchCommand(initArgs, { projectRoot: linkRoot })).toBe(0);
      expect(await readFile(join(realCb, 'manifest.json'), 'utf8')).toBe(manifest1);
    });
  });
});
