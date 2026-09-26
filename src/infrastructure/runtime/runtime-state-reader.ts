import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { HARNESS_IDS, type HarnessId } from '../../core/contracts/harness.js';
import type { BlockLine, Clock, ErrorLine, SessionLine } from '../../core/contracts/session-ledger.js';
import type { HarnessLedger } from '../../core/services/active-sessions.js';
import { blockLineSchema, errorLineSchema, parseLedgerLines } from '../../core/contracts/session-ledger.js';
import { selectRecentErrors, type RuntimeStateReading } from '../../core/services/brake-session-checks.js';
import { listRuntimeStateFiles } from '../storage/runtime-state-files.js';
import { isMissingFileError, LEDGER_FILE_EXTENSION, runtimeDirectory, SESSIONS_RELATIVE_PREFIX } from './runtime-paths.js';

const BLOCKS_FILE_NAME = 'blocks.jsonl';
const ERRORS_FILE_NAME = 'errors.jsonl';

export class NodeRuntimeStateReader {
  constructor(readonly projectRoot: string, readonly clock: Clock) {}

  async read(): Promise<RuntimeStateReading | null> {
    if (!(await isDirectory(runtimeDirectory(this.projectRoot)))) return null;
    const files = await listRuntimeStateFiles(this.projectRoot);
    const ledgerFiles = files.filter((file) => file.startsWith(SESSIONS_RELATIVE_PREFIX) && file.endsWith(LEDGER_FILE_EXTENSION));
    const ledgers = await this.readLedgers(ledgerFiles);
    return {
      sessions: ledgers.flatMap((ledger) => ledger.lines.filter((line): line is SessionLine => line.type === 'session')),
      ledgers,
      blocks: await readBlockLines(this.projectRoot),
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

async function readBlockLines(projectRoot: string): Promise<BlockLine[]> {
  const content = await readTextIfPresent(join(runtimeDirectory(projectRoot), BLOCKS_FILE_NAME));
  const blocks: BlockLine[] = [];
  for (const value of parseJsonLines(content)) {
    const result = blockLineSchema.safeParse(value);
    if (result.success) blocks.push(result.data);
  }
  return blocks;
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
