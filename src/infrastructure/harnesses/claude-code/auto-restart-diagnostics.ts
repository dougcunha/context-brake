import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import semver from 'semver';
import type { DiagnosticFinding } from '../../../core/contracts/diagnostics.js';
import type { VersionProbe } from '../../../core/contracts/harness.js';
import { pathExists } from '../common/path-helpers.js';
import { latestRestartLog } from '../common/restart-diagnostics.js';
import { MOD_FILES } from './auto-restart-files.js';
import { hasModKeys } from './auto-restart-settings.js';
import { MOD_LOG_DIR, MOD_VERSION } from './mod/mod-info.js';
import { CLAUDE_LOCAL_SETTINGS_FILE } from './statusline-settings.js';

export const MODS_MINIMUM_CLAUDE_VERSION = '2.1.287';
const REINSTALL = 'Run context-brake init --auto-restart, then restart Claude Code.';
const NOT_LOADED_CAUSES = 'Start Claude Code in this project and trust the folder. Mods stay off under disableAllHooks, --safe-mode, --bare, an organization managed policy, and in Desktop WSL sessions; check those settings.';

export type AutoRestartDiagnosis = { readonly projectRoot: string; readonly wanted: boolean; readonly version: VersionProbe | null };
type FindingText = { readonly code: string; readonly severity: DiagnosticFinding['severity']; readonly path: string | null; readonly message: string; readonly impact: string | null; readonly remediation: string | null };

const OFF: FindingText = { code: 'AUTO_RESTART_OFF', severity: 'ok', path: null, message: 'Automatic restart is off.', impact: null, remediation: 'Run context-brake init --auto-restart to turn it on.' };
const READY: FindingText = { code: 'AUTO_RESTART_READY', severity: 'ok', path: MOD_LOG_DIR, message: 'Automatic restart is on and Claude Code loaded the mod.', impact: null, remediation: null };
const NOT_LOADED: FindingText = { code: 'AUTO_RESTART_NOT_LOADED', severity: 'warning', path: MOD_LOG_DIR, message: 'Automatic restart is on, but no Claude Code session has loaded the mod yet.', impact: 'Claude Code does not clear the session when ContextBrake asks for a reset.', remediation: NOT_LOADED_CAUSES };
const FILES_DRIFTED: FindingText = { code: 'AUTO_RESTART_OUTDATED_MOD', severity: 'warning', path: CLAUDE_LOCAL_SETTINGS_FILE, message: 'The mod files or their entries in .claude/settings.local.json are missing.', impact: 'Claude Code cannot load the mod.', remediation: REINSTALL };
function sessionDrifted(modVersion: string): FindingText {
  return { code: 'AUTO_RESTART_OUTDATED_MOD', severity: 'warning', path: MOD_LOG_DIR, message: `The last Claude Code session loaded mod ${modVersion}, but ContextBrake installs ${MOD_VERSION}.`, impact: 'The running mod may not match this ContextBrake version.', remediation: REINSTALL };
}
function tooOld(version: string): FindingText {
  return { code: 'AUTO_RESTART_CLAUDE_TOO_OLD', severity: 'warning', path: null, message: `Claude Code ${version} is older than ${MODS_MINIMUM_CLAUDE_VERSION}, the first version with mods on by default.`, impact: 'Claude Code does not load the automatic-restart mod.', remediation: `Update Claude Code to ${MODS_MINIMUM_CLAUDE_VERSION} or later.` };
}
function lastSkip(code: string, at: string): FindingText {
  const severity = code.startsWith('ERROR_') ? 'warning' : 'ok';
  return { code: 'AUTO_RESTART_LAST_SKIP', severity, path: MOD_LOG_DIR, message: `The last restart request was not carried out: ${code} at ${at}.`, impact: severity === 'ok' ? null : 'The session was not cleared.', remediation: 'See the notice in the Claude Code transcript for that turn.' };
}

export async function diagnoseAutoRestart(input: AutoRestartDiagnosis): Promise<DiagnosticFinding[]> {
  if (!input.wanted) return [finding(OFF)];
  const normalized = input.version?.normalized ?? null;
  if (normalized !== null && semver.lt(normalized, MODS_MINIMUM_CLAUDE_VERSION)) return [finding(tooOld(normalized))];
  if (!(await isInstalled(input.projectRoot))) return [finding(FILES_DRIFTED)];
  const log = await latestRestartLog(input.projectRoot, 'claude-code');
  if (log === null) return [finding(NOT_LOADED)];
  if (log.componentVersion !== MOD_VERSION) return [finding(sessionDrifted(log.componentVersion))];
  const last = log.records.at(-1);
  const skip = last !== undefined && last.code !== 'RESTARTED' ? [finding(lastSkip(last.code, last.at))] : [];
  return [finding(READY), ...skip];
}

async function isInstalled(projectRoot: string): Promise<boolean> {
  const present = await Promise.all(MOD_FILES.map((path) => pathExists(resolve(projectRoot, path))));
  if (present.includes(false)) return false;
  const settings = await readFile(resolve(projectRoot, CLAUDE_LOCAL_SETTINGS_FILE), 'utf8').catch(() => null);
  if (settings === null) return false;
  try {
    return hasModKeys(settings);
  } catch {
    return false;
  }
}

function finding(text: FindingText): DiagnosticFinding {
  return { ...text, scope: 'harness', harness: 'claude-code' };
}
