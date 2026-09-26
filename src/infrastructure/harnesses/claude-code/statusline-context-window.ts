import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ContextWindowReport } from '../../../core/contracts/context-window-report.js';
import { parseLedgerLines } from '../../../core/contracts/session-ledger.js';
import { summarizeStatusline } from '../../../core/services/statusline-summary.js';
import { LEDGER_FILE_EXTENSION, sessionsDirectory } from '../../runtime/runtime-paths.js';
import { CLAUDE_LOCAL_SETTINGS_FILE, commandOf, readSettings } from './statusline-settings.js';
import { readStatuslineState } from './statusline-state.js';

const ALL_LINES = -1;

type LedgerFile = { readonly path: string; readonly modifiedMilliseconds: number };

export async function readClaudeContextWindow(projectRoot: string): Promise<ContextWindowReport> {
  const lastWindowTokens = await lastRecordedWindow(projectRoot);
  return { bridge: await bridgeState(projectRoot), source: lastWindowTokens === null ? 'contextWindowCeiling' : 'statusline', lastWindowTokens };
}

export async function localStatuslineCommand(projectRoot: string): Promise<string | null> {
  const local = await readSettings(resolve(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE));
  return local.kind === 'valid' ? commandOf(local.statusLine) : null;
}

async function bridgeState(projectRoot: string): Promise<ContextWindowReport['bridge']> {
  const state = await readStatuslineState(projectRoot);
  if (state === null) return 'absent';
  return (await localStatuslineCommand(projectRoot)) === state.installedCommand ? 'installed' : 'inactive';
}

async function lastRecordedWindow(projectRoot: string): Promise<number | null> {
  for (const ledger of await ledgersNewestFirst(sessionsDirectory(projectRoot, 'claude-code'))) {
    const content = await readFile(ledger.path, 'utf8').catch(() => '');
    const windowTokens = summarizeStatusline(parseLedgerLines(content), ALL_LINES).windowTokens;
    if (windowTokens !== null) return windowTokens;
  }
  return null;
}

async function ledgersNewestFirst(directory: string): Promise<LedgerFile[]> {
  const names = await readdir(directory).catch((): string[] => []);
  const ledgers = await Promise.all(names.filter((entry) => entry.endsWith(LEDGER_FILE_EXTENSION)).map((name) => ledgerFile(join(directory, name))));
  return ledgers.filter((ledger): ledger is LedgerFile => ledger !== null).sort((left, right) => right.modifiedMilliseconds - left.modifiedMilliseconds);
}

async function ledgerFile(path: string): Promise<LedgerFile | null> {
  const modifiedMilliseconds = (await stat(path).catch(() => null))?.mtimeMs;
  return modifiedMilliseconds === undefined ? null : { path, modifiedMilliseconds };
}
