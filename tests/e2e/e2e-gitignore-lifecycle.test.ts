import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installReportSchema } from '../../src/core/contracts/diagnostics.js';
import { GITIGNORE_START_MARKER } from '../../src/core/services/gitignore-markers.js';
import { countOccurrences, gitignoreBlock, setupHarnessRepo } from '../helpers/gitignore-fixtures.js';
import { runBuiltCli } from './cli-runner.js';

describe('E2E-11: built CLI previews the ignore block (CA-11, CA-21)', () => {
  let dir: string;
  beforeEach(async () => { dir = await setupHarnessRepo('cb-e2e-11-a-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('dry-run reports the ignore_block change without writing', async () => {
    const user = '# user comment\n*.log\n';
    await writeFile(join(dir, '.gitignore'), user, 'utf8');

    const dry = await runBuiltCli(['init', '--dry-run', '--json'], dir);
    expect(dry.code).toBe(0);
    const report = installReportSchema.parse(JSON.parse(dry.stdout));
    const change = report.plan.changes.find((c) => c.path === '.gitignore');
    expect(change?.owner).toBe('ignore_block');
    expect(change?.kind).toBe('update');
    expect(await readFile(join(dir, '.gitignore'), 'utf8')).toBe(user);
  });

  it('dry-run plans a create for an absent .gitignore without writing it', async () => {
    const dry = await runBuiltCli(['init', '--dry-run', '--json'], dir);
    expect(dry.code).toBe(0);
    const report = installReportSchema.parse(JSON.parse(dry.stdout));
    expect(report.plan.changes.find((c) => c.path === '.gitignore')?.kind).toBe('create');
    expect(await readFile(join(dir, '.gitignore'), 'utf8').catch(() => null)).toBeNull();
  });
});

describe('E2E-11: built CLI idempotent confirmed installs (CA-11, CA-21)', () => {
  let dir: string;
  beforeEach(async () => { dir = await setupHarnessRepo('cb-e2e-11-b-'); });
  afterEach(async () => { await rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('three confirmed installs leave one block and unchanged user bytes', async () => {
    const user = '# user comment\n*.log\n!important.log\n';
    await writeFile(join(dir, '.gitignore'), user, 'utf8');

    for (let run = 0; run < 3; run += 1) {
      expect((await runBuiltCli(['init', '--yes'], dir)).code).toBe(0);
    }

    const content = await readFile(join(dir, '.gitignore'), 'utf8');
    expect(content).toBe(`${user}\n${gitignoreBlock()}\n`);
    expect(countOccurrences(content, GITIGNORE_START_MARKER)).toBe(1);
  });
});
