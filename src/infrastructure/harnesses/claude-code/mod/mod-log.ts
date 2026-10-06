import { modLogSchema, MOD_LOG_VERSION, type ModLog, type RestartReasonCode } from '../../../../core/contracts/auto-restart.js';
import { appendLogRecord, buildLogRecord } from '../../../../core/services/auto-restart-notices.js';
import type { ModHost } from './host.js';
import { MOD_LOG_DIR, MOD_VERSION } from './mod-info.js';

async function logPath($: ModHost): Promise<string> {
  return `${await $.session.root()}/${MOD_LOG_DIR}/${await $.session.id()}.json`;
}

async function emptyLog($: ModHost): Promise<ModLog> {
  return { v: MOD_LOG_VERSION, modVersion: MOD_VERSION, claudeVersion: (await $.session.version()).version, records: [] };
}

async function readLog($: ModHost, path: string): Promise<ModLog> {
  if (!(await $.fs.exists(path))) return emptyLog($);
  try {
    const parsed = modLogSchema.safeParse(JSON.parse(String(await $.fs.read(path))));
    return parsed.success ? parsed.data : await emptyLog($);
  } catch {
    return emptyLog($);
  }
}

async function writeLog($: ModHost, path: string, log: ModLog): Promise<void> {
  await $.fs.write(path, `${JSON.stringify(log, null, 2)}\n`);
}

export async function recordLoaded($: ModHost): Promise<void> {
  const path = await logPath($);
  const log = await readLog($, path);
  await writeLog($, path, { ...log, modVersion: MOD_VERSION, claudeVersion: (await $.session.version()).version });
}

export async function recordDecision($: ModHost, code: RestartReasonCode): Promise<void> {
  const path = await logPath($);
  const log = await readLog($, path);
  const at = new Date(await $.clock.now()).toISOString();
  await writeLog($, path, { ...log, records: [...appendLogRecord(log.records, buildLogRecord(code, at))] });
}
