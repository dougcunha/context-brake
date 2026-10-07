import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { runInShell, type ShellType } from '../e2e/shell-runner.js';
import { testClaudeInstall } from '../helpers/cli-fixtures.js';

const SHELLS: readonly ShellType[] = process.platform === 'win32' ? ['powershell', 'bash'] : ['bash', 'native'];

for (const shell of SHELLS) {
  describe(`CLI install through each shell [${shell}] (CA-20, prd-13 DEC-04 shell quoting)`, () => {
    let tempDir: string;
    beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), `cb-e2e-10-${shell}-`)); });
    afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

    it('executes Claude installation (CA-01, CA-20)', () => testClaudeInstall((a) => runInShell(shell, a, tempDir), tempDir));
  });
}
