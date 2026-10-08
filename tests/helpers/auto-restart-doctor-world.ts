import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiagnosticFinding } from '../../src/core/contracts/diagnostics.js';
import type { ProcessRunner } from '../../src/core/contracts/processes.js';
import { ClaudeAdapter } from '../../src/infrastructure/harnesses/claude-code/adapter.js';
import { MOD_LOG_DIR, MOD_VERSION } from '../../src/infrastructure/harnesses/claude-code/mod/mod-info.js';

const CURRENT_CLAUDE = '2.1.289';

function claudeRunner(version: string): ProcessRunner {
  return {
    discover: async () => [{ name: 'claude', path: 'claude', timedOut: false }],
    run: async () => ({ status: 'completed', exitCode: 0, stdout: `${version} (Claude Code)\n`, stderr: '' }),
  };
}

export async function autoRestartFindings(root: string, autoRestart: boolean, version = CURRENT_CLAUDE): Promise<DiagnosticFinding[]> {
  const findings = await new ClaudeAdapter().diagnose({ projectRoot: root, runner: claudeRunner(version), autoRestart });
  return findings.filter((finding) => finding.code.startsWith('AUTO_RESTART_'));
}

export async function writeModLog(root: string, name: string, log: unknown): Promise<void> {
  await mkdir(join(root, MOD_LOG_DIR), { recursive: true });
  await writeFile(join(root, MOD_LOG_DIR, `${name}.json`), typeof log === 'string' ? log : JSON.stringify(log), 'utf8');
}

export function modLog(records: readonly { at: string; code: string }[], modVersion = MOD_VERSION): unknown {
  return { v: 2, harness: 'claude-code', componentVersion: modVersion, harnessVersion: CURRENT_CLAUDE, records };
}
