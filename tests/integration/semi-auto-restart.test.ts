import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/contracts/configuration.js';
import { loadHarnessPayload } from '../helpers/harness-payloads.js';
import { runHookInProcess, type ProcessHookHarness } from '../helpers/in-process-hook.js';

type SessionStartCase = { readonly harness: ProcessHookHarness; readonly event: string; readonly overrides: Record<string, unknown> };

const CASES: readonly SessionStartCase[] = [
  { harness: 'codex-cli', event: 'SessionStart', overrides: { source: 'clear' } },
  { harness: 'cursor', event: 'sessionStart', overrides: {} },
  { harness: 'github-copilot-cli', event: 'sessionStart', overrides: { source: 'new' } },
];
const RESUME = /\[ContextBrake resume v1\] Read \\?"\.context-brake\/handoffs\/\d{8}T\d{6}\.\d{3}Z\.md\\?" and continue the previous work from it\./;

async function writeConfig(root: string, autoRestart: boolean): Promise<void> {
  const config = autoRestart ? { ...DEFAULT_CONFIG, autoRestart: { maxConsecutiveRestarts: 2 } } : DEFAULT_CONFIG;
  await writeFile(join(root, 'context-brake.config.json'), JSON.stringify(config), 'utf8');
}

async function writeHandoff(root: string): Promise<void> {
  await mkdir(join(root, '.context-brake'), { recursive: true });
  await writeFile(join(root, '.context-brake', 'handoff.md'), '# Goal\n', 'utf8');
}

async function startSession(root: string, item: SessionStartCase): Promise<string> {
  const payload = { ...(await loadHarnessPayload(item.harness, 'session-start.json') as Record<string, unknown>), ...item.overrides, cwd: root };
  const result = await runHookInProcess({ harness: item.harness, projectRoot: root, event: item.event, payload });
  expect(result.code).toBe(0);
  return result.stdout;
}

describe('semi-automatic resume at session start (prd-14 FR-02, FR-03, FR-08, TC-10)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'cb-semi-restart-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it.each(CASES)('$harness delivers a pending handoff once and archives it', async (item) => {
    await writeConfig(root, true);
    await writeHandoff(root);
    expect(await startSession(root, item)).toMatch(RESUME);
    expect(await startSession(root, item)).not.toMatch(RESUME);
    expect(await readdir(join(root, '.context-brake', 'handoffs'))).toHaveLength(1);
  });
  it('leaves the handoff pending with automatic restart off (NFR-05)', async () => {
    await writeConfig(root, false);
    await writeHandoff(root);
    expect(await startSession(root, CASES[0]!)).not.toMatch(RESUME);
    expect(await readdir(join(root, '.context-brake'))).toContain('handoff.md');
  });
});
