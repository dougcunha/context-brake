import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RestartReasonCode } from '../../../core/contracts/auto-restart.js';
import type { HarnessId } from '../../../core/contracts/harness.js';
import { RESTART_LOG_RELATIVE_DIR, RESTART_LOG_VERSION, restartLogSchema, UNKNOWN_HARNESS_VERSION, type RestartLog } from '../../../core/contracts/restart-log.js';
import { appendLogRecord, buildLogRecord } from '../../../core/services/auto-restart-notices.js';
import { ensureRuntimeDirectory, isMissingFileError } from '../../runtime/runtime-paths.js';
import { RESTART_COMPONENT_VERSION } from './in-process-restart-state.js';

const LINE_END = '\n';

export type RestartLogTarget = { readonly root: string; readonly harness: HarnessId; readonly sessionId: string };

function logPath(target: RestartLogTarget): string {
  return join(target.root, RESTART_LOG_RELATIVE_DIR, target.harness, `${target.sessionId}.json`);
}

function emptyLog(harness: HarnessId): RestartLog {
  return { v: RESTART_LOG_VERSION, harness, componentVersion: RESTART_COMPONENT_VERSION, harnessVersion: UNKNOWN_HARNESS_VERSION, records: [] };
}

async function readLog(target: RestartLogTarget): Promise<RestartLog> {
  try {
    const parsed = restartLogSchema.safeParse(JSON.parse(await readFile(logPath(target), 'utf8')));
    return parsed.success ? parsed.data : emptyLog(target.harness);
  } catch (error) {
    if (isMissingFileError(error) || error instanceof SyntaxError) return emptyLog(target.harness);
    throw error;
  }
}

async function writeLog(target: RestartLogTarget, log: RestartLog): Promise<void> {
  await ensureRuntimeDirectory(target.root);
  await mkdir(join(target.root, RESTART_LOG_RELATIVE_DIR, target.harness), { recursive: true });
  await writeFile(logPath(target), JSON.stringify({ ...log, componentVersion: RESTART_COMPONENT_VERSION }, null, 2) + LINE_END, 'utf8');
}

export async function recordInProcessLoaded(target: RestartLogTarget): Promise<void> {
  await writeLog(target, await readLog(target));
}

export async function recordInProcessDecision(target: RestartLogTarget, code: RestartReasonCode, at: Date): Promise<void> {
  const log = await readLog(target);
  await writeLog(target, { ...log, records: [...appendLogRecord(log.records, buildLogRecord(code, at.toISOString()))] });
}
