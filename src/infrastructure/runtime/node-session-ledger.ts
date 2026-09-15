import { appendFile, readFile, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { SessionKey } from '../../core/contracts/runtime.js';
import { parseLedgerLines, resetLineSchema, sessionLineSchema, toolLineSchema, SESSION_RETENTION_DAYS } from '../../core/contracts/session-ledger.js';
import type { Clock, LedgerLine, ResetReason, SessionLedger, SessionLineInput, ToolLineInput } from '../../core/contracts/session-ledger.js';
import { listRuntimeStateFiles } from '../storage/runtime-state-files.js';
import { ensureSessionDirectory, isMissingFileError, LEDGER_FILE_EXTENSION, sessionLedgerPath, SESSIONS_RELATIVE_PREFIX } from './runtime-paths.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class NodeSessionLedger implements SessionLedger {
  constructor(readonly projectRoot: string, readonly clock: Clock) {}

  async readLines(key: SessionKey): Promise<readonly LedgerLine[]> {
    const content = await readFile(sessionLedgerPath(this.projectRoot, key), 'utf8').catch((error: unknown) => {
      if (isMissingFileError(error)) return '';
      throw error;
    });
    return parseLedgerLines(content);
  }

  async appendSessionLine(key: SessionKey, input: SessionLineInput): Promise<void> {
    await this.append(key, sessionLineSchema.parse({ v: 1, type: 'session', at: this.timestamp(), harness: key.harness, sessionId: key.sessionId, agentId: key.agentId, ...input }));
  }

  async appendToolLine(key: SessionKey, input: ToolLineInput): Promise<void> {
    await this.append(key, toolLineSchema.parse({ v: 1, type: 'tool', at: this.timestamp(), ...input }));
  }

  async appendResetLine(key: SessionKey, reason: ResetReason): Promise<void> {
    await this.append(key, resetLineSchema.parse({ v: 1, type: 'reset', at: this.timestamp(), reason }));
  }

  async pruneStaleSessions(): Promise<number> {
    const cutoff = this.clock.now().getTime() - SESSION_RETENTION_DAYS * MILLISECONDS_PER_DAY;
    const files = await listRuntimeStateFiles(this.projectRoot);
    let pruned = 0;
    for (const file of files) {
      if (!file.startsWith(SESSIONS_RELATIVE_PREFIX) || !file.endsWith(LEDGER_FILE_EXTENSION)) continue;
      if (await this.prune(resolve(this.projectRoot, file), cutoff)) pruned += 1;
    }
    return pruned;
  }

  private async prune(filePath: string, cutoffMilliseconds: number): Promise<boolean> {
    const stats = await stat(filePath).catch((error: unknown) => {
      if (isMissingFileError(error)) return null;
      throw error;
    });
    if (stats === null || stats.mtime.getTime() >= cutoffMilliseconds) return false;
    await unlink(filePath).catch((error: unknown) => {
      if (!isMissingFileError(error)) throw error;
    });
    return true;
  }

  private async append(key: SessionKey, line: LedgerLine): Promise<void> {
    await ensureSessionDirectory(this.projectRoot, key);
    await appendFile(sessionLedgerPath(this.projectRoot, key), `${JSON.stringify(line)}\n`, 'utf8');
  }

  private timestamp(): string {
    return this.clock.now().toISOString();
  }
}
