import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HarnessId } from '../../core/contracts/harness.js';
import { errorLineSchema } from '../../core/contracts/session-ledger.js';
import type { Clock, ErrorRecordInput, RuntimeErrorLog } from '../../core/contracts/session-ledger.js';
import { ensureRuntimeDirectory, runtimeDirectory } from './runtime-paths.js';

const ERRORS_FILE_NAME = 'errors.jsonl';

export class NodeRuntimeErrorLog implements RuntimeErrorLog {
  constructor(readonly projectRoot: string, readonly clock: Clock) {}

  async append(harness: HarnessId, input: ErrorRecordInput): Promise<void> {
    const line = errorLineSchema.parse({ v: 1, at: this.clock.now().toISOString(), harness, ...input });
    await appendRuntimeLine(this.projectRoot, ERRORS_FILE_NAME, line);
  }
}

async function appendRuntimeLine(projectRoot: string, fileName: string, line: unknown): Promise<void> {
  await ensureRuntimeDirectory(projectRoot);
  await appendFile(join(runtimeDirectory(projectRoot), fileName), `${JSON.stringify(line)}\n`, 'utf8');
}
