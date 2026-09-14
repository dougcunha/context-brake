import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { runInShell, type ShellType } from './shell-runner.js';
import { testClaudeInstall, testIdempotency, testSymlinkTarget } from './e2e-10-fixtures.js';

const SHELLS: readonly ShellType[] = process.platform === 'win32' ? ['powershell', 'bash'] : ['bash', 'native'];

for (const shell of SHELLS) {
  describe(`E2E-10: Cross-platform [${shell}] (CA-20)`, () => {
    let tempDir: string;
    beforeEach(async () => { tempDir = await mkdtemp(join(tmpdir(), `cb-e2e-10-${shell}-`)); });
    afterEach(async () => { await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

    it('executes Claude installation (CA-01, CA-20)', () => testClaudeInstall((a) => runInShell(shell, a, tempDir), tempDir));
    it('preserves idempotency over 3 runs (CA-05, CA-20)', () => testIdempotency((a) => runInShell(shell, a, tempDir), tempDir));
    it('preserves symbolic link (CA-07, CA-20)', () => testSymlinkTarget((a) => runInShell(shell, a, tempDir), tempDir));
  });
}
