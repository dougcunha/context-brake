import { lstat, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runInit } from '../../src/cli/commands/init.js';
import { runRemove } from '../../src/cli/commands/remove.js';
import { GITIGNORE_END_MARKER, GITIGNORE_START_MARKER } from '../../src/core/services/gitignore-markers.js';
import { attemptGit, requireGit, runGit } from '../helpers/git-capability.js';
import { countOccurrences, createRepo, gitignoreBlock, initArgs, pathExists, removeArgs, writeHarnessSignal } from '../helpers/gitignore-fixtures.js';
import { attemptLink, requireLink } from '../helpers/link-capability.js';

describe('IT-17: .gitignore survives three installations (CA-21)', () => {
  let dir: string;
  beforeEach(async () => { dir = await createRepo('cb-it17-a-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
  it('keeps one block and byte-identical user comments after three inits', async () => {
    await writeHarnessSignal(dir);
    const original = '# user comment\n*.log\n!important.log\n';
    await writeFile(join(dir, '.gitignore'), original, 'utf8');
    for (let run = 0; run < 3; run += 1) {
      expect(await runInit(initArgs(), { projectRoot: dir })).toBe(0);
    }
    const content = await readFile(join(dir, '.gitignore'), 'utf8');
    expect(content).toBe(`${original}\n${gitignoreBlock()}\n`);
    expect(countOccurrences(content, GITIGNORE_START_MARKER)).toBe(1);
    expect(countOccurrences(content, GITIGNORE_END_MARKER)).toBe(1);
  });
});

describe('IT-17: absent, CRLF, and no-final-newline .gitignore fixtures (CA-21)', () => {
  let dir: string;
  beforeEach(async () => { dir = await createRepo('cb-it17-b-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
  it('creates only the block when the file is absent', async () => {
    await writeHarnessSignal(dir);
    expect(await runInit(initArgs(), { projectRoot: dir })).toBe(0);
    expect(await readFile(join(dir, '.gitignore'), 'utf8')).toBe(`${gitignoreBlock()}\n`);
  });
  it('preserves CRLF line endings and the missing final newline', async () => {
    await writeHarnessSignal(dir);
    const crlf = '# user\r\n*.log\r\n';
    await writeFile(join(dir, '.gitignore'), crlf, 'utf8');
    expect(await runInit(initArgs(), { projectRoot: dir })).toBe(0);
    expect(await readFile(join(dir, '.gitignore'), 'utf8')).toBe(`${crlf}\r\n${gitignoreBlock('\r\n')}\r\n`);
    const noFinal = '# user';
    await writeFile(join(dir, '.gitignore'), noFinal, 'utf8');
    expect(await runInit(initArgs(), { projectRoot: dir })).toBe(0);
    expect(await readFile(join(dir, '.gitignore'), 'utf8')).toBe(`${noFinal}\n${gitignoreBlock()}`);
  });
});

describe('IT-17: symlinked .gitignore stays a link (CA-21)', () => {
  let dir: string;
  beforeEach(async () => { dir = await createRepo('cb-it17-c-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
  it('writes the resolved target once and keeps the symbolic link', async (ctx) => {
    await writeHarnessSignal(dir);
    const target = join(dir, 'gitignore-target');
    const link = join(dir, '.gitignore');
    await writeFile(target, '# linked user content\n', 'utf8');
    await requireLink(ctx, await attemptLink(target, link, 'file'), link);
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(await runInit(initArgs(), { projectRoot: dir })).toBe(0);
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    const content = await readFile(target, 'utf8');
    expect(countOccurrences(content, GITIGNORE_START_MARKER)).toBe(1);
    expect(content).toContain('# linked user content\n');
  });
});

describe('IT-18: state files are ignored by git (CA-12, CA-21)', () => {
  let dir: string;
  beforeEach(async () => { dir = await createRepo('cb-it18-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
  it('ignores state files after init and default removal, then removes them with the block', async (ctx) => {
    await requireGit(ctx, await attemptGit());
    await runGit(['init', '-q'], dir);
    await writeHarnessSignal(dir);
    expect(await runInit(initArgs(), { projectRoot: dir })).toBe(0);
    await writeFile(join(dir, 'task_plan.json'), '{"task":"x"}\n', 'utf8');
    await writeFile(join(dir, 'state_checkpoint.json'), '{"step":1}\n', 'utf8');
    const afterInit = await runGit(['status', '--porcelain'], dir);
    expect(afterInit).not.toContain('task_plan.json');
    expect(afterInit).not.toContain('state_checkpoint.json');
    expect(await runRemove(removeArgs(false), { projectRoot: dir })).toBe(0);
    expect(await pathExists(join(dir, 'task_plan.json'))).toBe(true);
    expect(await pathExists(join(dir, 'state_checkpoint.json'))).toBe(true);
    const afterDefault = await runGit(['status', '--porcelain'], dir);
    expect(afterDefault).not.toContain('task_plan.json');
    expect(afterDefault).not.toContain('state_checkpoint.json');
    expect(await runRemove(removeArgs(true), { projectRoot: dir })).toBe(0);
    expect(await pathExists(join(dir, 'task_plan.json'))).toBe(false);
    expect(await pathExists(join(dir, 'state_checkpoint.json'))).toBe(false);
    expect(await readFile(join(dir, '.gitignore'), 'utf8').catch(() => null)).toBeNull();
  });
});
