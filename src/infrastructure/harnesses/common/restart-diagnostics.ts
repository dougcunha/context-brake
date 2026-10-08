import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { HarnessContext } from '../../../core/contracts/adapter.js';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import type { HarnessId } from '../../../core/contracts/harness.js';
import { RESTART_LOG_RELATIVE_DIR, restartLogSchema, type RestartLog } from '../../../core/contracts/restart-log.js';
import { RESTART_COMPONENT_VERSION } from './in-process-restart-state.js';
import { pathExists } from './path-helpers.js';

export type InProcessRestartSpec = { readonly harness: HarnessId; readonly label: string; readonly restartFile: string; readonly modeText: string };

const REINSTALL = 'Run context-brake init --auto-restart, then restart the harness.';

async function readLog(path: string): Promise<RestartLog | null> {
  try {
    const parsed = restartLogSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function latestRestartLog(projectRoot: string, harness: HarnessId): Promise<RestartLog | null> {
  const dir = resolve(projectRoot, RESTART_LOG_RELATIVE_DIR, harness);
  const names = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith('.json'));
  const dated = await Promise.all(names.map(async (name) => ({ path: join(dir, name), mtime: (await stat(join(dir, name)).catch(() => null))?.mtimeMs ?? -1 })));
  for (const entry of dated.sort((a, b) => b.mtime - a.mtime)) {
    const log = await readLog(entry.path);
    if (log !== null) return log;
  }
  return null;
}

function restartFinding(spec: InProcessRestartSpec, text: Pick<DiagnosticFinding, 'code' | 'severity' | 'message' | 'impact' | 'remediation'>): DiagnosticFinding {
  return { ...text, scope: 'harness', harness: spec.harness, path: `${RESTART_LOG_RELATIVE_DIR}/${spec.harness}` };
}

function logFindings(spec: InProcessRestartSpec, log: RestartLog): DiagnosticFinding[] {
  if (log.componentVersion !== RESTART_COMPONENT_VERSION) return [restartFinding(spec, { code: 'AUTO_RESTART_OUTDATED_MOD', severity: 'warning', message: `The last ${spec.label} session loaded restart module ${log.componentVersion}, but ContextBrake installs ${RESTART_COMPONENT_VERSION}.`, impact: 'The running module may not match this ContextBrake version.', remediation: REINSTALL })];
  const ready = restartFinding(spec, { code: 'AUTO_RESTART_READY', severity: 'ok', message: `Automatic restart is on and ${spec.label} loaded the restart module.`, impact: spec.modeText, remediation: null });
  const last = log.records.at(-1);
  if (last === undefined || last.code === 'RESTARTED') return [ready];
  const severity = last.code.startsWith('ERROR_') ? 'warning' : 'ok';
  return [ready, restartFinding(spec, { code: 'AUTO_RESTART_LAST_SKIP', severity, message: `The last restart request was not carried out: ${last.code} at ${last.at}.`, impact: severity === 'ok' ? null : 'The session was not restarted.', remediation: `See the notice in the ${spec.label} session for that turn.` })];
}

export async function diagnoseInProcessRestart(context: HarnessContext, spec: InProcessRestartSpec): Promise<DiagnosticFinding[]> {
  if (context.autoRestart !== true) return [];
  if (!(await pathExists(resolve(context.projectRoot, spec.restartFile)))) return [{ ...restartFinding(spec, { code: 'AUTO_RESTART_OUTDATED_MOD', severity: 'warning', message: `The restart module ${spec.restartFile} is missing.`, impact: `${spec.label} cannot restart the session.`, remediation: REINSTALL }), path: spec.restartFile }];
  const log = await latestRestartLog(context.projectRoot, spec.harness);
  if (log !== null) return logFindings(spec, log);
  return [restartFinding(spec, { code: 'AUTO_RESTART_NOT_LOADED', severity: 'warning', message: `Automatic restart is on, but no ${spec.label} session has loaded the restart module yet.`, impact: `${spec.label} does not restart the session when ContextBrake asks for a reset.`, remediation: `Start ${spec.label} in this project and trust the folder.` })];
}
