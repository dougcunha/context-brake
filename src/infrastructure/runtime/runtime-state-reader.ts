import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { HARNESS_IDS, type HarnessId } from '../../core/contracts/harness.js';
import type { Clock, ErrorLine } from '../../core/contracts/session-ledger.js';
import type { HarnessLedger } from '../../core/services/active-sessions.js';
import { errorLineSchema, parseLedgerLines } from '../../core/contracts/session-ledger.js';
import { selectRecentErrors, type RuntimeStateReading } from '../../core/services/runtime-error-checks.js';
import { listRuntimeStateFiles } from '../storage/runtime-state-files.js';
import { isMissingFileError, LEDGER_FILE_EXTENSION, runtimeDirectory, SESSIONS_RELATIVE_PREFIX } from './runtime-paths.js';

const ERRORS_FILE_NAME = 'errors.jsonl';

export class NodeRuntimeStateReader {
  constructor(readonly projectRoot: string, readonly clock: Clock) {}

  async read(): Promise<RuntimeStateReading | null> {
    if (!(await isDirectory(runtimeDirectory(this.projectRoot)))) return null;
    const files = await listRuntimeStateFiles(this.projectRoot);
    const ledgerFiles = files.filter((file) => file.startsWith(SESSIONS_RELATIVE_PREFIX) && file.endsWith(LEDGER_FILE_EXTENSION));
    const ledgers = await this.readLedgers(ledgerFiles);
    return {
      ledgers,
      errors: selectRecentErrors(await readErrorLines(this.projectRoot), this.clock.now()),
    };
  }

  private async readLedgers(files: readonly string[]): Promise<HarnessLedger[]> {
    const ledgers: HarnessLedger[] = [];
    for (const file of files) {
      const harness = harnessOf(file);
      const lines = parseLedgerLines((await readTextIfPresent(resolve(this.projectRoot, file))) ?? '');
      if (harness !== null) ledgers.push({ harness, lines });
    }
    return ledgers;
  }
}

function harnessOf(file: string): HarnessId | null {
  const segment = file.slice(SESSIONS_RELATIVE_PREFIX.length).split('/')[0] ?? '';
  return HARNESS_IDS.find((id) => id === segment) ?? null;
}

async function isDirectory(path: string): Promise<boolean> {
  const stats = await stat(path).catch((error: unknown) => {
    if (isMissingFileError(error)) return null;
    throw error;
  });
  return stats?.isDirectory() ?? false;
}

async function readTextIfPresent(path: string): Promise<string | null> {
  return readFile(path, 'utf8').catch((error: unknown) => {
    if (isMissingFileError(error)) return null;
    throw error;
  });
}

async function readErrorLines(projectRoot: string): Promise<ErrorLine[]> {
  const content = await readTextIfPresent(join(runtimeDirectory(projectRoot), ERRORS_FILE_NAME));
  const errors: ErrorLine[] = [];
  for (const value of parseJsonLines(content)) {
    const result = errorLineSchema.safeParse(value);
    if (result.success) errors.push(result.data);
  }
  return errors;
}

function parseJsonLines(content: string | null): unknown[] {
  if (content === null) return [];
  const values: unknown[] = [];
  for (const text of content.split(/\r?\n/)) {
    if (text.trim() === '') continue;
    try {
      values.push(JSON.parse(text) as unknown);
    } catch {
      continue;
    }
  }
  return values;
}
