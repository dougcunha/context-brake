import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { testIdempotency, testSymlinkTarget } from '../helpers/cli-fixtures.js';
import { runInProcessCli } from '../helpers/in-process-cli.js';

describe('init idempotency and symbolic links in process (CA-05, CA-07, prd-13 DEC-03)', () => {
  let tempDir: string;
  beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), 'cb-init-idempotency-')); });
  afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it('preserves idempotency over 3 runs (CA-05)', () => testIdempotency((args) => runInProcessCli(args, tempDir), tempDir));
  it('preserves a symbolic link target (CA-07)', (ctx) => testSymlinkTarget((args) => runInProcessCli(args, tempDir), tempDir, ctx));
});
